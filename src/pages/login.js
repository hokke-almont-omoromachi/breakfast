import React, { useState } from "react";
import { auth } from "../firebaseConfig";
import {
  setPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await setPersistence(auth, browserSessionPersistence); // Chỉ giữ session khi tab đang mở
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/home");
    } catch (error) {
      console.error("Login failed:", error.message);
      alert("ログイン失敗しました。");
    }
  };

  return (
    <div style={{
      backgroundColor: "#F2EBE0",
      padding: "20px",
      width: "300px", // Điều chỉnh chiều rộng theo mong muốn
      margin: "70px auto", // Thêm margin-top và căn giữa
      borderRadius: "8px", // Thêm chút bo tròn (tùy chọn)
      display: "flex", // Sử dụng flexbox để căn giữa nút
      flexDirection: "column", // Sắp xếp các phần tử theo cột
      alignItems: "center", // Căn giữa các phần tử theo chiều ngang
    }}>
      <h2 style={{ marginBottom: "20px" }}>はなもみ</h2> {/* Thêm tiêu đề LOGIN */}
      <form onSubmit={handleLogin} style={{ width: "100%" }}> {/* Đảm bảo form chiếm hết chiều rộng container */}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ユーザー"
          required
          style={{ marginBottom: "10px", width: "100%", padding: "8px", boxSizing: "border-box" }} // Chiếm hết chiều rộng ô
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワード"
          required
          style={{ marginBottom: "20px", width: "100%", padding: "8px", boxSizing: "border-box" }} // Chiếm hết chiều rộng ô
        />
        <button type="submit" style={{ width: "100%", padding: "10px" }}>ログイン</button> {/* Nút chiếm hết chiều rộng */}
      </form>
    </div>
  );
};

export default Login;