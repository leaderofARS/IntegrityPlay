#!/usr/bin/env python3
"""evaluation/metrics.py

Simple evaluation utilities for classification of alerts against ground truth labels.
Supports JSONL inputs where each line is a JSON object with 'alert_id' and 'label' (malicious|benign or 1|0).
"""
from __future__ import annotations
import json, os, sys
from typing import Dict

def load_labels(path: str) -> Dict[str, int]:
    labels = {}
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line=line.strip()
            if not line:
                continue
            try:
                j = json.loads(line)
            except Exception:
                continue
            aid = j.get("alert_id") or j.get("id") or j.get("name") or None
            lab = j.get("label") if j.get("label") is not None else j.get("y")
            if aid is None or lab is None:
                continue
            if isinstance(lab, str):
                lab = 1 if lab.lower() in ("malicious","true","1","pos","y") else 0
            else:
                lab = int(bool(lab))
            labels[aid] = lab
    return labels

def compute_metrics(predicted: Dict[str,int], truth: Dict[str,int]) -> Dict[str,float]:
    TP=FP=TN=FN=0
    for aid, t in truth.items():
        p = predicted.get(aid, 0)
        if t==1 and p==1:
            TP+=1
        elif t==1 and p==0:
            FN+=1
        elif t==0 and p==1:
            FP+=1
        elif t==0 and p==0:
            TN+=1
    for aid,p in predicted.items():
        if aid not in truth and p==1:
            FP += 1
    precision = TP/(TP+FP) if (TP+FP)>0 else 0.0
    recall = TP/(TP+FN) if (TP+FN)>0 else 0.0
    f1 = (2*precision*recall)/(precision+recall) if (precision+recall)>0 else 0.0
    accuracy = (TP+TN)/max(1, TP+TN+FP+FN)
    return {"precision":precision, "recall":recall, "f1":f1, "accuracy":accuracy, "TP":TP,"FP":FP,"TN":TN,"FN":FN}

def main():
    import argparse
    p = argparse.ArgumentParser(description='Compute simple classification metrics for alerts')
    p.add_argument('--pred', required=True, help='Path to predicted alerts JSONL (each object must have alert_id and label (1/0) or absent -> label=1)')
    p.add_argument('--truth', required=True, help='Path to ground-truth JSONL (alert_id + label)')
    args = p.parse_args()

    pred_labels = {}
    with open(args.pred, "r", encoding="utf-8") as f:
        for line in f:
            try:
                j = json.loads(line)
            except Exception:
                continue
            aid = j.get("alert_id") or j.get("id")
            lab = j.get("label")
            if aid is None:
                continue
            if lab is None:
                lab = 1
            if isinstance(lab, str):
                lab = 1 if lab.lower() in ("malicious","true","1","pos","y") else 0
            pred_labels[aid] = int(bool(lab))

    truth = load_labels(args.truth)
    metrics = compute_metrics(pred_labels, truth)
    print(json.dumps(metrics, indent=2))

if __name__ == '__main__':
    main()
