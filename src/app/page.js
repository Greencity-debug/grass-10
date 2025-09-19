"use client";

import Lottie from "lottie-react";
import animationData from "./animation.json";

export default function HomePage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#f0f0f0',
      fontFamily: 'sans-serif'
    }}>
      <h1>Добро пожаловать в наше ГИС-приложение!</h1>
      <p>Давайте начнем создавать что-то удивительное.</p>
      <div style={{ marginTop: '20px' }}>
        <Lottie
          animationData={animationData}
          style={{ width: 500, height: 500 }}
        />
      </div>
    </div>
  );
}