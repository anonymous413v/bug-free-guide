"""Quick integration test — run with .venv Python from repo root."""
import requests
import json

def test_health():
    r = requests.get("http://localhost:8000/api/health")
    assert r.status_code == 200
    data = r.json()
    print("=== HEALTH ===")
    print(json.dumps(data, indent=2))
    assert data["status"] == "ok"
    assert data["inference_available"] is True
    print("✓ Health check passed")

def test_models():
    r = requests.get("http://localhost:8000/api/models")
    assert r.status_code == 200
    data = r.json()
    print("\n=== MODELS ===")
    for m in data:
        print(f"  {m['id']}: {m['availability']} — {m['name']}")
    print("✓ Models endpoint passed")

def test_inference_selected():
    with open("test_audio.wav", "rb") as f:
        files = {"audio_file": ("test_audio.wav", f, "audio/wav")}
        data = {"model_ids": '["aasist","rawnet2"]', "mode": "selected"}
        r = requests.post("http://localhost:8000/api/inference", files=files, data=data)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    result = r.json()
    print("\n=== INFERENCE (selected: aasist, rawnet2) ===")
    print(json.dumps(result, indent=2))
    assert result["risk"]["models_succeeded"] >= 1
    print(f"✓ Inference passed — risk_level={result['risk']['risk_level']}")

def test_inference_auto():
    with open("test_audio.wav", "rb") as f:
        files = {"audio_file": ("test_audio.wav", f, "audio/wav")}
        data = {"mode": "auto"}
        r = requests.post("http://localhost:8000/api/inference", files=files, data=data)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    result = r.json()
    print("\n=== INFERENCE (auto mode) ===")
    print(f"  Mode: {result['evaluation_mode']}")
    print(f"  Models run: {result['selected_models']}")
    print(f"  Risk: {result['risk']['risk_level']} ({result['risk']['risk_score']})")
    print(f"  Models ok/fail: {result['risk']['models_succeeded']}/{result['risk']['models_failed']}")
    print("✓ Auto inference passed")

if __name__ == "__main__":
    test_health()
    test_models()
    test_inference_selected()
    test_inference_auto()
    print("\n=== ALL TESTS PASSED ===")
