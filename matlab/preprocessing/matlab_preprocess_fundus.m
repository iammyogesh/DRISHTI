function [processedImg, retinaMask, claheImg, greenChannel] = matlab_preprocess_fundus(inputImg, targetSize)
% MATLAB_PREPROCESS_FUNDUS Preprocess retinal fundus photographs for DR screening.
%
% Implements MathWorks Image Processing Toolbox pipeline:
% 1. Retinal field-of-view (FOV) circular mask extraction
% 2. Bounding box cropping around the retina
% 3. Green channel extraction (highest vascular/lesion contrast)
% 4. Contrast Limited Adaptive Histogram Equalization (adapthisteq)
% 5. Ben Graham illumination correction via Gaussian smoothing (imgaussfilt)
%
% Inputs:
%   inputImg   - RGB fundus image (matrix or filename string)
%   targetSize - Scalar or [H, W] target dimension (default: 512)
%
% Outputs:
%   processedImg - Ben Graham normalized RGB image for deep learning input [0..1]
%   retinaMask   - Binary logical mask of retinal disc
%   claheImg     - Enhanced L* or Green channel image
%   greenChannel - Isolated green color plane (uint8)
%
% MathWorks Toolboxes Required:
%   - Image Processing Toolbox
%
% DRISHTI SIH 2026 - MathWorks Problem Statement Implementation

    if nargin < 2
        targetSize = 512;
    end
    if ischar(inputImg) || isstring(inputImg)
        rawRGB = imread(inputImg);
    else
        rawRGB = inputImg;
    end

    if ~isa(rawRGB, 'uint8')
        rawRGB = im2uint8(rawRGB);
    end

    % 1. Retinal FOV Mask Segmentation
    grayImg = rgb2gray(rawRGB);
    initialMask = grayImg > 10;
    
    % Morphological cleanup of circular disc
    seCircle = strel('disk', 8);
    cleanMask = imclose(initialMask, seCircle);
    cleanMask = imopen(cleanMask, seCircle);
    retinaMask = bwareafilt(cleanMask, 1); % Keep largest connected component

    % 2. Crop to Retinal Bounding Box
    stats = regionprops(retinaMask, 'BoundingBox');
    if ~isempty(stats)
        bbox = round(stats(1).BoundingBox);
        % Bound check
        x1 = max(1, bbox(1));
        y1 = max(1, bbox(2));
        x2 = min(size(rawRGB, 2), x1 + bbox(3));
        y2 = min(size(rawRGB, 1), y1 + bbox(4));
        croppedRGB = rawRGB(y1:y2, x1:x2, :);
        croppedMask = retinaMask(y1:y2, x1:x2);
    else
        croppedRGB = rawRGB;
        croppedMask = retinaMask;
    end

    % Resize to target dimension
    if isscalar(targetSize)
        sz = [targetSize, targetSize];
    else
        sz = targetSize;
    end
    resizedRGB = imresize(croppedRGB, sz, 'bicubic');
    resizedMask = imresize(croppedMask, sz, 'nearest');

    % 3. Green Channel Isolation
    greenChannel = resizedRGB(:, :, 2);

    % 4. CLAHE Enhancement (MATLAB adapthisteq on L* channel)
    labImg = rgb2lab(resizedRGB);
    L_channel = labImg(:, :, 1) / 100; % Normalize to [0..1]
    enhanced_L = adapthisteq(L_channel, 'ClipLimit', 0.025, 'NumTiles', [8 8], 'Distribution', 'rayleigh');
    labImg(:, :, 1) = enhanced_L * 100;
    claheImg = lab2rgb(labImg);

    % 5. Ben Graham Illumination Normalization
    % I_norm = 4*I - 4*imgaussfilt(I, sigma) + 128
    sigma = max(1, round(sz(1) / 30));
    doubleRGB = im2double(resizedRGB);
    blurredRGB = imgaussfilt(doubleRGB, sigma);
    normalized = 4 * doubleRGB - 4 * blurredRGB + 0.5;
    normalized = min(max(normalized, 0), 1);

    % Re-apply retina mask to avoid boundary ring artifacts
    mask3 = repmat(resizedMask, [1 1 3]);
    normalized(~mask3) = 0;

    processedImg = normalized;
end
