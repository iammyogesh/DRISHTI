function [dlnet, classNames] = matlab_load_model(onnxModelPath)
% MATLAB_LOAD_MODEL Load PyTorch ONNX model into MATLAB Deep Learning Toolbox.
%
% Implements MathWorks Deep Learning Toolbox network import:
% 1. Imports ONNX network using importNetworkFromONNX or importNetworkFromPyTorch
% 2. Configures dlnetwork object for automatic differentiation and Grad-CAM
% 3. Sets DR severity classes (0: No DR, 1: Mild, 2: Moderate, 3: Severe, 4: Proliferative)
%
% Inputs:
%   onnxModelPath - String path to .onnx model file (optional, defaults to local drishti_dr_model.onnx)
%
% Outputs:
%   dlnet      - MATLAB dlnetwork object for inference and gradient calculation
%   classNames - Cell array of 5 clinical DR severity categories
%
% MathWorks Toolboxes Required:
%   - Deep Learning Toolbox
%   - Deep Learning Toolbox Converter for ONNX Model Format (Support Package)
%
% DRISHTI SIH 2026 - MathWorks Problem Statement Implementation

    if nargin < 1 || isempty(onnxModelPath)
        currentDir = fileparts(mfilename('fullpath'));
        onnxModelPath = fullfile(currentDir, 'drishti_dr_model.onnx');
    end

    classNames = { ...
        'No Diabetic Retinopathy (Grade 0)', ...
        'Mild Non-Proliferative DR (Grade 1)', ...
        'Moderate Non-Proliferative DR (Grade 2)', ...
        'Severe Non-Proliferative DR (Grade 3)', ...
        'Proliferative DR (Grade 4)' ...
    };

    if ~isfile(onnxModelPath)
        fprintf('[MATLAB DL] ONNX model file not found at %s\n', onnxModelPath);
        fprintf('[MATLAB DL] Run export_pytorch_to_onnx.py first to generate ONNX artifact.\n');
        dlnet = [];
        return;
    end

    fprintf('[MATLAB DL] Importing ONNX model into MATLAB Deep Learning Toolbox: %s\n', onnxModelPath);
    try
        % Import as MATLAB dlnetwork for fast inference & Grad-CAM support
        dlnet = importNetworkFromONNX(onnxModelPath, 'OutputNetwork', 'dlnetwork');
        fprintf('[MATLAB DL] Network successfully initialized. Total learnables: %d layers.\n', length(dlnet.Learnables));
    catch ME
        fprintf('[MATLAB DL] Standard importNetworkFromONNX error: %s\n', ME.message);
        fprintf('[MATLAB DL] Falling back to DAGNetwork representation...\n');
        try
            importedDAG = importNetworkFromONNX(onnxModelPath, 'OutputNetwork', 'dagnetwork');
            dlnet = dlnetwork(importedDAG);
            fprintf('[MATLAB DL] DAGNetwork successfully converted to dlnetwork.\n');
        catch ME2
            error('Failed to import ONNX model into MATLAB: %s', ME2.message);
        end
    end
end
