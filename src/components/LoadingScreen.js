'use client';

import { motion } from 'framer-motion';

/**
 * Loading screen ber-animasi (Framer Motion) dengan identitas Umalink.
 * - Logo "app icon" muncul dengan spring + float halus
 * - Ring gradien berputar + titik mengorbit
 * - Wordmark UMALINK & progress bar indeterminate
 */
export default function LoadingScreen({ tagline = 'Memuat halaman…' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[60] grid place-items-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#17A2E0 0%,#2E5BC8 55%,#243CA0 100%)' }}
    >
      {/* blob dekoratif */}
      <motion.div
        className="absolute rounded-full bg-white/10 blur-2xl"
        style={{ width: 340, height: 340, top: '-12%', right: '-8%' }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full bg-cyan-300/15 blur-2xl"
        style={{ width: 300, height: 300, bottom: '-10%', left: '-10%' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
      />

      <div className="relative flex flex-col items-center">
        {/* Logo + ring + orbit */}
        <div className="relative grid place-items-center" style={{ width: 200, height: 200 }}>
          {/* ring gradien berputar */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 184, height: 184,
              background: 'conic-gradient(from 0deg,#ffffff00,#ffffff,#7ee8ff,#ffffff00 65%)',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px))',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
          />
          {/* titik mengorbit */}
          <motion.div
            className="absolute"
            style={{ width: 184, height: 184 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
          >
            <span className="absolute left-1/2 -top-1 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
          </motion.div>

          {/* Logo */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.1 }}
          >
            <motion.img
              src="/umalink-logo.png"
              alt="Umalink"
              width={128}
              height={128}
              className=" shadow-2xl"
              style={{ display: 'block' }}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        </div>

        {/* Wordmark */}
        <motion.div
          initial={{ opacity: 0, y: 10, letterSpacing: '0.5em' }}
          animate={{ opacity: 1, y: 0, letterSpacing: '0.35em' }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="mt-7 text-white font-extrabold text-2xl pl-[0.35em]"
        >
          UMALINK
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-1.5 text-white/70 text-sm"
        >
          {tagline}
        </motion.div>

        {/* Progress indeterminate */}
        <div className="mt-6 h-1 w-48 rounded-full bg-white/20 overflow-hidden">
          <motion.div
            className="h-full w-1/3 rounded-full bg-white"
            animate={{ x: ['-120%', '320%'] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </motion.div>
  );
}
