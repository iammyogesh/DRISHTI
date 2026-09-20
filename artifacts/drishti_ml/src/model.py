"""
src/model.py
=============
Thin wrapper around a timm pretrained backbone for DR grade classification.

Why timm + a pretrained ImageNet backbone instead of training from scratch:
the dataset (92k images) is large for a hackathon but still tiny compared
to ImageNet's ~14M images. Transfer learning from ImageNet weights gives
the model a huge head start on general visual features (edges, textures,
blob/vessel-like structures) so it converges to a much higher accuracy in
far fewer epochs than training from random weights would.
"""

from __future__ import annotations
import timm
import torch
import torch.nn as nn


class DRClassifier(nn.Module):
    def __init__(self, model_name: str, num_classes: int, pretrained: bool = True,
                 dropout: float = 0.3):
        super().__init__()
        # num_classes=0 -> timm gives us the backbone with pooled features
        # and no classification head, so we can attach our own (with dropout).
        self.backbone = timm.create_model(model_name, pretrained=pretrained, num_classes=0)
        feat_dim = self.backbone.num_features

        self.head = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(feat_dim, num_classes),
        )
        self.model_name = model_name
        self.num_classes = num_classes

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        feats = self.backbone(x)
        return self.head(feats)

    def get_gradcam_target_layer(self):
        """
        Returns the last convolutional block of the backbone -- the standard
        Grad-CAM target for CNN classifiers. Works for the timm EfficientNet /
        EfficientNetV2 / ConvNeXt family used in config.MODEL_NAME. If you
        swap in a very different architecture (e.g. a pure transformer/ViT),
        override config.GRADCAM_TARGET_LAYER manually and update src/gradcam.py.
        """
        name = self.model_name.lower()
        if "efficientnet" in name:
            # timm EfficientNet(V2) backbones expose `.conv_head` as the last
            # conv layer before global pooling.
            if hasattr(self.backbone, "conv_head"):
                return self.backbone.conv_head
            # fallback: last block of the feature extractor
            return self.backbone.blocks[-1]
        if "convnext" in name:
            return self.backbone.stages[-1]
        # Generic fallback: last child module of the backbone.
        return list(self.backbone.children())[-1]


def build_model(model_name: str, num_classes: int, pretrained: bool, dropout: float) -> DRClassifier:
    return DRClassifier(model_name, num_classes, pretrained, dropout)


def count_parameters(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters() if p.requires_grad)
