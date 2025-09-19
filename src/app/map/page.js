"use client";

import dynamic from "next/dynamic";
import Sidebar from "../../components/Sidebar";
import { motion } from "framer-motion";

const YandexMap = dynamic(() => import("../../components/Map"), {
  ssr: false,
});

export default function MapPage() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        <Sidebar />
      </motion.div>
      <div style={{ flex: 1, marginLeft: 300 }}>
        <YandexMap />
      </div>
    </div>
  );
}