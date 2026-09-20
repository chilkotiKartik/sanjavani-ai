# Contributing to Sanjeevani Voice AI

Thank you for your interest in contributing to Sanjeevani! We welcome contributions that help improve clinical safety, multi-language speech recognition, local routing, accessibility, and resilience.

---

## 📜 Code of Conduct

We are committed to providing a welcoming, safe, and inclusive environment for all contributors. Please ensure all communication remains constructive, professional, and respectful.

---

## 🛡️ Clinical & Safety Requirements

Sanjeevani operates on strict safety principles:
1. **Deterministic Priority**: Clinical safety rules must execute *before* and *independently* of any generative AI model.
2. **Zero Diagnosis / Prescription**: Sanjeevani does not provide medical diagnoses or prescribe medications.
3. **Emergency Circuit Breaker**: Red flags must immediately surface the 112 emergency screen.
4. **Benchmark Verification**: All changes touching `packages/medical-safety` must pass `npm run eval` with 100% emergency recall and 0% false alarms.

---

## 🛠️ Development Workflow

### 1. Fork & Clone

```bash
git clone https://github.com/<your-username>/sanjavani-ai.git
cd sanjavani-ai
npm install
```

### 2. Create a Feature Branch

Use semantic branch names:
- `feature/voice-barge-in-enhancement`
- `fix/offline-geohash-caching`
- `safety/cardiac-red-flag-update`
- `docs/api-spec-expansion`

```bash
git checkout -b feature/your-feature-name
```

### 3. Verification & Testing

Before opening a pull request, run all quality checks:

```bash
npm run check:secrets   # Ensures no server secret leakage in bundles
npm run typecheck       # Workspace TypeScript check
npm test                # Unit and integration test suite
npm run eval            # 65-vignette clinical safety validation
```

---

## 🚀 Submitting a Pull Request

1. Push your branch to your fork.
2. Open a Pull Request against the `main` branch.
3. Fill out the PR template completely with details of what changed, screenshots for UI changes, and test outcomes.
4. Ensure all CI workflow checks pass.

Thank you for helping make healthcare navigation safer and more accessible!
