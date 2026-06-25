# Load tests (k6)

```bash
# Stream stress
TOKEN=$(./scripts/get-token.sh) VIDEO_ID=1 k6 run qa/load/k6-stream.js

# Upload stress
TOKEN=$(./scripts/get-token.sh) k6 run qa/load/k6-upload.js
```
