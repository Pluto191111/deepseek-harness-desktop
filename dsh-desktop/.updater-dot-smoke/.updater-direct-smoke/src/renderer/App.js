import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
const initialStatus = { kind: 'starting' };
export function App() {
    const [status, setStatus] = useState(initialStatus);
    useEffect(() => {
        const desktop = window.desktop;
        if (desktop === undefined) {
            setStatus({
                kind: 'error',
                message: 'The desktop bridge did not load. Close the app, run npm run build, and start it again.',
            });
            return;
        }
        void desktop.getStatus().then(setStatus);
        return desktop.onEngineStatus(setStatus);
    }, []);
    if (status.kind === 'ready') {
        return (_jsx("main", { className: "engine-frame", children: _jsx("iframe", { title: "DeepSeek Harness", src: status.url, allow: "clipboard-read; clipboard-write" }) }));
    }
    const failed = status.kind === 'error';
    return (_jsx("main", { className: "startup-screen", children: _jsxs("section", { className: "startup-card", "aria-live": "polite", children: [_jsx("p", { className: "eyebrow", children: "DSH Desktop" }), _jsx("h1", { children: failed ? '无法启动本地引擎' : '正在启动本地引擎' }), _jsx("p", { children: failed ? status.message : 'DeepSeek Harness 正在准备本地 Web 工作区。' }), failed && _jsx("button", { type: "button", onClick: () => void window.desktop.restartEngine(), children: "\u91CD\u8BD5" })] }) }));
}
