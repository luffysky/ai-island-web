"use client";
// Widget 錯誤隔離（port from Space）：單一 widget 崩潰不影響其他、保留格線位置、可重載、連壞 3 次可移除。
import { Component, type ReactNode } from "react";

type Props = {
  definitionId: string;
  name: string;
  onDisable?: () => void;
  children: ReactNode;
};
type State = { error: Error | null; failureCount: number };

export class WidgetBoundary extends Component<Props, State> {
  override state: State = { error: null, failureCount: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidCatch(error: Error) {
    this.setState((prev) => ({ failureCount: prev.failureCount + 1 }));
    // 只記識別資訊、不含使用者內容
    console.error(`[widget:${this.props.definitionId}]`, error.name);
  }

  private reset = () => this.setState({ error: null });

  override render() {
    if (!this.state.error) return this.props.children;
    const exhausted = this.state.failureCount >= 3;
    return (
      <div className="h-full rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] p-4 flex flex-col justify-center text-center" role="alert">
        <strong className="text-sm text-rose-600 dark:text-rose-400">{this.props.name}</strong>
        <p className="text-xs text-fg-muted my-2">
          {exhausted ? "這個區塊一直出問題，可以先移除它，其他不受影響。" : "這個區塊暫時無法顯示。"}
        </p>
        <div className="flex justify-center gap-2">
          {!exhausted && (
            <button type="button" onClick={this.reset} className="text-xs px-3 py-1 rounded-lg border border-border hover:border-accent">重新載入</button>
          )}
          {exhausted && this.props.onDisable && (
            <button type="button" onClick={this.props.onDisable} className="text-xs px-3 py-1 rounded-lg border border-rose-500/40 text-rose-500">移除</button>
          )}
        </div>
      </div>
    );
  }
}
