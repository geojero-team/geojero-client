import { useEffect, useState } from "react";

function App() {
  const [status, setStatus] = useState("호출 중");

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/health`)
      .then((res) => (res.ok ? res.text() : Promise.reject(res.status)))
      .then((data) => setStatus(`성공: ${data}`))
      .catch((err) => setStatus(`실패: ${err}`));
  }, []);

  return (
    <div style={{ padding: 40, fontSize: 20 }}>
      <p>API_BASE: {import.meta.env.VITE_API_BASE_URL ?? "(없음)"}</p>
      <p>{status}</p>
    </div>
  );
}

export default App;
