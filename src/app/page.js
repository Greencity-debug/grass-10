"use client";

import Lottie from "lottie-react";
import animationData from "./animation.json";
import Link from "next/link";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <main className="welcome-container">
      <div className="content-box">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="title">
            Grasscutter
            <span className="subtitle-title">
              Система управления зеленым хозяйством
            </span>
          </h1>
          <div className="button-container">
            <Link href="/map">
              <button className="button primary-button">Режим наблюдателя</button>
            </Link>
            <Link href="/map">
              <button className="button secondary-button">Режим управления</button>
            </Link>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="animation-wrapper"
        >
          <Lottie
            animationData={animationData}
            style={{ width: 400, height: 400 }}
          />
        </motion.div>
      </div>
    </main>
  );
}