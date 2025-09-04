# IntegrityPlay — Privacy-First Real-Time Market Surveillance  
**Adversarial-proven detection • Tamper-evident evidence packs • Privacy-preserving consortium mode**

Hackathon submission for **Global Fintech Festival 2025 — SEBI Securities Market Hackathon**, powered by **BSE, CDSL, KFinTech, NSDL, SEBI**.

---

## 🎯 Mission
Protect retail investors and maintain fair, transparent markets by detecting fraud in **seconds**, proving it with **tamper-evident evidence packs**, and sharing insights securely across market infrastructure **without exposing raw PII**.

---

## 🚀 Key Differentiators
- **Adversarial-first demo** — includes synthetic attack simulator (wash trades, layering, circular trading).  
- **Tamper-evident forensic packs** — every alert anchored to a ledger via SHA-256 hash.  
- **Privacy-preserving consortium mode** — federated stubs simulate hashed signal exchange between custodians/exchanges.  
- **Narrative forensics** — converts raw alerts into plain-English investigative timelines.  
- **Judge-ready reproducibility** — run the entire pipeline in **<10 minutes** via Docker.  

---

## 👥 Intended Users
- **Primary:** SEBI surveillance teams, BSE/NSE exchanges, NSDL/CDSL depositories.  
- **Secondary:** Clearing corporations, registrars (KFinTech), compliance units at brokers.  
- **Tertiary:** Forensic/legal investigators, insurance/underwriting entities.  

---

## 🏗️ Architecture
![architecture](docs/architecture.png)  
- **Attack Simulator** → feeds **Ingest**  
- **Graph Adapter** builds account/order/beneficiary links  
- **Detector** (rules + ML stubs) raises alerts  
- **Narrative Engine** produces English summaries  
- **Evidence Anchor** fingerprints → anchors on ledger  
- **Federated Stub** simulates privacy-preserving sharing  

See `docs/sequence_diagram.png` for process flow.

---

## 📂 Repository Layout

- README.md
- pitch.mp4
- docker-compose.yml
- scripts/
   - attack_simulator.py
   - run_demo.sh
- app/
   - ingest.py
   - rule_engine.py
   - detector.py
   - graph_adapter.py
   - narrative.py
- tools/
   - anchor_evidence.py
   - federated_stub.py
- evaluation/
   - metrics.py
   - run_evaluation.sh
- results/
   - detection_results.csv
- evidence_samples/
   - sample_evidence_001.json
- frontend/
   - README.md
- build/
- docs/
- architecture.png
- sequence_diagram.png
- LICENSE


---

## 🔑 Features
- **Detection** of wash trades, layering/spoofing, and circular trading.  
- **Evidence packs** in JSON + auto-generated human-readable narrative.  
- **Anchoring** using `tools/anchor_evidence.py` (verifiable on-chain).  
- **Metrics & KPIs** for reproducibility: precision/recall, mean detection time, attack survival.  
- **Privacy stubs** proving PII never leaves custodian boundary.  

---

## 📊 Example Evidence Pack
```json
{
  "evidence_id": "EV-0001",
  "detected_at": "2025-09-04T10:01:23Z",
  "scenario": "wash_trade",
  "sha256_fingerprint": "d2f1e3...<truncated>",
  "anchor_tx": { "chain": "hardhat-local", "tx_hash": "0xabc123..." },
  "narrative": "Between 09:59:02 and 10:01:23 account X repeatedly traded with account Y..."
}

'''

---



