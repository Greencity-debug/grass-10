"use client";

import Lottie from "lottie-react";
import animationData from "./animation.json";

export default function HomePage() {
  return (
    <main className="welcome-container">
      <div className="content-box">
        <h1 className="title">
          Grasscutter
          <span className="subtitle-title">
            Система управления зеленым хозяйством
          </span>
        </h1>
        <div className="button-container">
          <button className="button primary-button">Режим наблюдателя</button>
          <button className="button secondary-button">Режим управления</button>
        </div>
        <div className="animation-wrapper">
          <Lottie
            animationData={animationData}
            style={{ width: 400, height: 400 }}
          />
        </div>
      </div>
    </main>
  );
}