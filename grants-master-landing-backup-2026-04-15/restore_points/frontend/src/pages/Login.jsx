import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/apiClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await apiClient("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (res && res.token) {
        navigate("/dashboard");
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full mb-4 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        {error && <div className="text-red-600 mb-4">{error}</div>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          Login
        </button>
      </form>
    </div>
  );
}
