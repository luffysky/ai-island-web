# 給 Python 生成腳本記 CLI 用量：shell 進 node 的 log-cli-usage.mjs。
# best-effort：任何失敗都不影響生成。用法：
#   from log_cli_usage import log_usage   (需先把 scripts/_lib 加進 sys.path)
#   log_usage(MODEL, data.get("usage",{}).get("input_tokens",0), data.get("usage",{}).get("output_tokens",0))
import os
import subprocess

_HELPER = os.path.join(os.path.dirname(__file__), "log-cli-usage.mjs")


def log_usage(model, input_tokens=0, output_tokens=0, provider="anthropic"):
    if not model:
        return
    try:
        subprocess.run(
            ["node", _HELPER, str(model), str(int(input_tokens or 0)), str(int(output_tokens or 0)), provider],
            cwd=os.path.join(os.path.dirname(__file__), "..", ".."),
            timeout=20,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    except Exception:
        pass  # 記錄失敗不影響生成
