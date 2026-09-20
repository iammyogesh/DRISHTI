# DRISHTI — MATLAB & Simulink Technical Package

This directory contains the official **MATLAB & Simulink** implementation of **DRISHTI** for the **Smart India Hackathon (SIH 2026)** MathWorks Problem Statement.

---

## 1. Directory Structure

```
matlab/
├── preprocessing/
│   ├── matlab_preprocess_fundus.m      % FOV mask, Ben Graham norm, adapthisteq CLAHE
│   ├── matlab_vessel_segmentation.m    % Morphological Top-Hat, Line STREL, density analysis
│   ├── matlab_optic_disc_fovea.m       % Circular Hough Transform & macular localization
│   └── matlab_quality_assessment.m     % Laplacian sharpness, FOV, illumination grading
├── deep_learning/
│   ├── export_pytorch_to_onnx.py       % PyTorch to ONNX converter for MATLAB DL Toolbox
│   ├── matlab_load_model.m             % importNetworkFromONNX model importer
│   ├── matlab_classify_dr.m            % End-to-end 5-grade DR classification
│   └── matlab_gradcam.m                % MATLAB Deep Learning Toolbox Grad-CAM visualizer
└── simulink/
    ├── create_drishti_simulink_model.m % Programmatic SimEvents district model builder
    ├── run_simulink_simulation.m       % M/M/c Discrete-Event simulation engine
    └── drishti_district_screening.slx  % District Tele-Ophthalmology Simulink Model
```

---

## 2. MathWorks Toolboxes Required

- **MATLAB** (R2022b, R2023a/b, R2024a/b)
- **Image Processing Toolbox** (`adapthisteq`, `imtophat`, `imfindcircles`, `bwareaopen`, `fspecial`)
- **Deep Learning Toolbox** (`importNetworkFromONNX`, `dlnetwork`, `dlarray`, `gradcam`)
- **Deep Learning Toolbox Converter for ONNX Model Format** (MATLAB Support Package)
- **Simulink & SimEvents** (for district telemedicine queue simulation)

---

## 3. Quick Start in MATLAB

### A. Preprocessing & Vessel Analysis
```matlab
% In MATLAB command window:
cd('matlab/preprocessing');
[processedImg, retinaMask, claheImg, greenPlane] = matlab_preprocess_fundus('sample_fundus.jpg', 512);
[vesselBinary, vesselDensity, vesselOverlay] = matlab_vessel_segmentation('sample_fundus.jpg');
quality = matlab_quality_assessment('sample_fundus.jpg');
```

### B. Deep Learning Classification & Explainability
```matlab
cd('matlab/deep_learning');
dlnet = matlab_load_model('drishti_dr_model.onnx');
diagnosis = matlab_classify_dr('sample_fundus.jpg', dlnet);
[gradcamMap, overlay] = matlab_gradcam('sample_fundus.jpg', dlnet, diagnosis.grade);
```

### C. Simulink Tele-Ophthalmology District Model
```matlab
cd('matlab/simulink');
% Run discrete-event simulation for 100,000 patients across 48 PHCs with 6 ophthalmologists:
simResults = run_simulink_simulation(100000, 48, 6, 3.5);
```
