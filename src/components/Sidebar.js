"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./Sidebar.module.css";
import { motion } from "framer-motion";
import { FaArrowLeft, FaRegSquare, FaPencilAlt, FaTrash } from "react-icons/fa";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const toolItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.titleContainer}>
          <Link href="/" className={styles.titleLink}>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className={styles.title}
            >
              Grasscutter
            </motion.h1>
          </Link>
          <motion.span 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={styles.version}
          >
            1.0
          </motion.span>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Link href="/" className={styles.backButton}>
            <FaArrowLeft size={24} />
          </Link>
        </motion.div>
      </div>

      <motion.div
        className={styles.navSections}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className={styles.section} variants={itemVariants}>
          <h2>Инструменты</h2>
          <motion.div 
            className={styles.toolList}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div className={styles.toolButton} variants={toolItemVariants}>
              <FaRegSquare className={styles.toolIcon} />
              <span className={styles.toolText}>Добавить участок</span>
            </motion.div>
            <motion.div className={styles.toolButton} variants={toolItemVariants}>
              <FaPencilAlt className={styles.toolIcon} />
              <span className={styles.toolText}>Редактировать</span>
            </motion.div>
            <motion.div className={styles.toolButton} variants={toolItemVariants}>
              <FaTrash className={styles.toolIcon} />
              <span className={styles.toolText}>Удалить участок</span>
            </motion.div>
          </motion.div>
        </motion.div>
        <motion.div className={styles.section} variants={itemVariants}>
          <h2>Слои</h2>
        </motion.div>
      </motion.div>
    </div>
  );
}