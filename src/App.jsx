import React, { useState, useEffect, useRef } from "react";
import { Trophy, RotateCcw } from "lucide-react";

const ReyesMagosDashGame = () => {
  const canvasRef = useRef(null);
  const controlsRef = useRef({ jump: () => {}, duck: () => {} });
  const [gameState, setGameState] = useState("menu");
  const [currentLevel, setCurrentLevel] = useState(1);
  const [gameMode, setGameMode] = useState("story");
  const [unlockedLevels, setUnlockedLevels] = useState([]);
  const [score, setScore] = useState(0);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const gameLoopRef = useRef(null);
  const audioContextRef = useRef(null);
  const musicIntervalRef = useRef(null);
  const beatStartRef = useRef(0);
  const beatCountRef = useRef(0);

  const treasureClues = {
    1: "🏟️ Todo gran jugador empieza sin mapa. Primero aprende a moverse, luego a decidir.",
    2: "⚽ Driblar no siempre es ir rápido, a veces es saber cuándo cambiar de dirección.",
    3: "🎯 Los pases cortos construyen el juego, como las decisiones pequeñas construyen el futuro.",
    4: "🥅 Un buen portero protege su meta, un buen jugador sabe qué vale la pena cuidar.",
    5: "🏆 Has ganado experiencia suficiente. Los Reyes Magos confían en ti. MAPA DESBLOQUEADO",
  };

  const levels = [
    {
      name: "Calentamiento en el Estadio",
      speed: 2.5,
      obstacleFreq: 180,
      difficulty: 0.5,
    },
    {
      name: "Fase de Grupos",
      speed: 3,
      obstacleFreq: 170,
      difficulty: 0.6,
    },
    {
      name: "Octavos de Final",
      speed: 3.5,
      obstacleFreq: 160,
      difficulty: 0.7,
    },
    { name: "Semifinal", speed: 4, obstacleFreq: 150, difficulty: 0.8 },
    { name: "La Gran Final", speed: 4.5, obstacleFreq: 140, difficulty: 0.9 },
  ];

  const mapImagePath = "/mapa-reyes-magos.png";
  const allLevelsCompleted =
    unlockedLevels.includes(levels.length) || currentLevel === levels.length;

  const bpm = 124;
  const beatIntervalMs = 60000 / bpm;

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  };

  const playTone = ({ frequency, duration, type, gain }) => {
    const context = getAudioContext();
    const oscillator = context.createOscillator();
    const amp = context.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    amp.gain.value = gain;
    oscillator.connect(amp);
    amp.connect(context.destination);

    const now = context.currentTime;
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.start(now);
    oscillator.stop(now + duration);
  };

  const playJumpSound = () => {
    playTone({ frequency: 520, duration: 0.15, type: "triangle", gain: 0.1 });
  };

  const playHitSound = () => {
    playTone({ frequency: 160, duration: 0.3, type: "sawtooth", gain: 0.12 });
  };

  const playBeatSound = (accent = false) => {
    playTone({
      frequency: accent ? 740 : 520,
      duration: accent ? 0.1 : 0.07,
      type: accent ? "square" : "sine",
      gain: accent ? 0.06 : 0.04,
    });
  };

  const startMusic = (mode) => {
    const context = getAudioContext();
    context.resume();
    if (musicIntervalRef.current) {
      clearInterval(musicIntervalRef.current);
    }
    beatCountRef.current = 0;
    beatStartRef.current = performance.now();
    musicIntervalRef.current = setInterval(() => {
      const isAccent = beatCountRef.current % 4 === 0;
      if (mode === "ritmo" || mode === "story") {
        playBeatSound(isAccent);
      }
      beatCountRef.current += 1;
    }, beatIntervalMs);
  };

  const stopMusic = () => {
    if (musicIntervalRef.current) {
      clearInterval(musicIntervalRef.current);
      musicIntervalRef.current = null;
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("reyesMagosProgress");
    if (saved) {
      setUnlockedLevels(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (gameState !== "playing") {
      stopMusic();
      return;
    }

    const BASE_WIDTH = 1000;
    const BASE_HEIGHT = 500;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let scaleFactor = 1;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      scaleFactor = Math.min(
        window.innerWidth / BASE_WIDTH,
        window.innerHeight / BASE_HEIGHT
      );
      const displayWidth = BASE_WIDTH * scaleFactor;
      const displayHeight = BASE_HEIGHT * scaleFactor;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      canvas.width = Math.floor(displayWidth * dpr);
      canvas.height = Math.floor(displayHeight * dpr);
      ctx.setTransform(dpr * scaleFactor, 0, 0, dpr * scaleFactor, 0, 0);
    };

    resizeCanvas();

    const storyConfig = levels[currentLevel - 1];
    const modeConfig =
      gameMode === "story"
        ? storyConfig
        : {
            name: gameMode === "endless" ? "Endless" : "Ritmo",
            speed: 3.2,
            obstacleFreq: 170,
            difficulty: 0.7,
          };

    let character = {
      x: 120,
      y: 380,
      width: 35,
      height: 45,
      velocityY: 0,
      gravity: 0.7,
      jumpPower: -13,
      isJumping: false,
      isDucking: false,
    };

    let obstacles = [];
    let stars = [];
    let particles = [];
    let frameCount = 0;
    let distance = 0;
    let hasCollided = false;
    const groundY = 430;
    const levelDistance = 5000;
    const worldWidth = BASE_WIDTH;
    const worldHeight = BASE_HEIGHT;

    for (let i = 0; i < 50; i++) {
      stars.push({
        x: Math.random() * worldWidth,
        y: Math.random() * (groundY - 50),
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.5 + 0.2,
      });
    }

    const jump = () => {
      if (!character.isJumping && !character.isDucking) {
        character.velocityY = character.jumpPower;
        character.isJumping = true;
        playJumpSound();
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }
      }
    };

    const duck = (isDucking) => {
      character.isDucking = isDucking;
    };

    const handleKeyDown = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        duck(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === "ArrowDown") {
        e.preventDefault();
        duck(false);
      }
    };

    const handleClick = () => jump();

    let pressTimeout;
    let pressTriggered = false;

    const handlePressStart = (event) => {
      event.preventDefault();
      pressTriggered = false;
      clearTimeout(pressTimeout);
      pressTimeout = setTimeout(() => {
        pressTriggered = true;
        duck(true);
      }, 200);
    };

    const handlePressEnd = (event) => {
      event.preventDefault();
      clearTimeout(pressTimeout);
      if (pressTriggered) {
        duck(false);
        pressTriggered = false;
      } else {
        jump();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("pointerdown", handlePressStart);
    canvas.addEventListener("pointerup", handlePressEnd);
    canvas.addEventListener("pointercancel", handlePressEnd);

    controlsRef.current = { jump, duck };

    const drawParallaxLayer = (color, speedFactor, height, opacity) => {
      const offset = (distance * speedFactor) % canvas.width;
      ctx.fillStyle = color;
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.moveTo(-offset, groundY - height);
      for (let x = -offset; x <= worldWidth + 200; x += 200) {
        ctx.quadraticCurveTo(
          x + 100,
          groundY - height - 20,
          x + 200,
          groundY - height
        );
      }
      ctx.lineTo(worldWidth + 200, groundY);
      ctx.lineTo(-200, groundY);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    const drawBackground = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, groundY);
      gradient.addColorStop(0, "#0a0e27");
      gradient.addColorStop(0.5, "#1a1f4d");
      gradient.addColorStop(1, "#2d3561");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, worldWidth, groundY);

      drawParallaxLayer("#1d2548", 0.15, 190, 0.9);
      drawParallaxLayer("#28315a", 0.35, 140, 0.85);
      drawParallaxLayer("#39406e", 0.55, 90, 0.8);

      stars.forEach((star) => {
        star.x -= star.speed * 1.4;
        if (star.x < 0) star.x = worldWidth;

        const twinkle = Math.sin(frameCount * 0.1 + star.x) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        if (twinkle > 0.7) {
          ctx.fillStyle = `rgba(255, 255, 200, ${twinkle * 0.3})`;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.fillStyle = "#f4e4c1";
      ctx.shadowBlur = 30;
      ctx.shadowColor = "#f4e4c1";
      ctx.beginPath();
      ctx.arc(850, 80, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      const groundGradient = ctx.createLinearGradient(
        0,
        groundY,
        0,
        worldHeight
      );
      groundGradient.addColorStop(0, "#d4a574");
      groundGradient.addColorStop(1, "#b8885a");
      ctx.fillStyle = groundGradient;
      ctx.fillRect(0, groundY, worldWidth, worldHeight - groundY);

      ctx.fillStyle = "rgba(210, 180, 140, 0.3)";
      ctx.beginPath();
      ctx.ellipse(
        200 - (distance * 0.9) % 400,
        groundY + 10,
        100,
        20,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(
        600 - (distance * 0.9) % 400,
        groundY + 15,
        120,
        25,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    };

    const spawnSpark = () => {
      const originX = character.x + character.width + 5;
      const originY = character.y + character.height / 2;
      for (let i = 0; i < 10; i++) {
        particles.push({
          x: originX,
          y: originY + (Math.random() - 0.5) * 20,
          vx: 1 + Math.random() * 2.5,
          vy: (Math.random() - 0.5) * 2,
          life: 24 + Math.random() * 10,
          size: 2 + Math.random() * 2,
          color: `rgba(255, ${180 + Math.random() * 60}, 80, 1)`,
        });
      }
    };

    const drawParticles = () => {
      particles = particles.filter((particle) => particle.life > 0);
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.05;
        particle.life -= 1;
        const alpha = Math.max(particle.life / 30, 0);
        ctx.fillStyle = particle.color.replace(", 1)", `, ${alpha})`);
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const drawSoccerBall = ({ x, y, radius, rotation = 0 }) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      const gradient = ctx.createRadialGradient(
        -radius * 0.3,
        -radius * 0.3,
        radius * 0.3,
        0,
        0,
        radius
      );
      gradient.addColorStop(0, "rgba(255,255,255,0.95)");
      gradient.addColorStop(1, "rgba(203,213,225,0.75)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      const drawPentagon = (size, offsetX, offsetY) => {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const px = offsetX + Math.cos(angle) * size;
          const py = offsetY + Math.sin(angle) * size;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = "#111827";
        ctx.fill();
      };

      drawPentagon(radius * 0.28, 0, 0);
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        drawPentagon(
          radius * 0.2,
          Math.cos(angle) * radius * 0.55,
          Math.sin(angle) * radius * 0.55
        );
      }

      ctx.restore();
    };

    const drawCharacter = () => {
      const x = character.x;
      const y = character.isDucking ? groundY - 25 : character.y;
      const height = character.isDucking
        ? character.height * 0.6
        : character.height;
      const width = character.width;
      const stride = Math.sin(frameCount * 0.2) * 6;
      const ballRoll = Math.sin(frameCount * 0.4) * 2;

      if (character.isDucking) {
        ctx.fillStyle = "#1e3a8a";
        ctx.fillRect(x + 2, y + 6, width + 6, height - 6);

        ctx.fillStyle = "#0b3a82";
        ctx.fillRect(x + 2, y + 6, width + 6, 6);

        ctx.fillStyle = "#ffdbac";
        ctx.beginPath();
        ctx.arc(x + 18, y + 4, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1f2937";
        ctx.beginPath();
        ctx.arc(x + 18, y + 1, 6, Math.PI, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#0f172a";
        ctx.fillRect(x + 6, y + 18, 20, 8);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x + 8, y + 20, 6, 6);
        ctx.fillRect(x + 18, y + 20, 6, 6);
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(x + 14, y + 18, 4, 10);

        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.moveTo(x + 4, y + height);
        ctx.lineTo(x + 28, y + height);
        ctx.lineTo(x + 16, y + height - 8);
        ctx.closePath();
        ctx.fill();

        drawSoccerBall({
          x: x + 34,
          y: y + height - 6,
          radius: 6,
          rotation: ballRoll * 0.2,
        });
      } else {
        ctx.fillStyle = "#1e3a8a";
        ctx.beginPath();
        ctx.ellipse(
          x + width / 2,
          y + 20,
          width / 2 + 4,
          height - 20,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = "#1e40af";
        ctx.beginPath();
        ctx.ellipse(
          x + width / 2,
          y + 20,
          width / 2 - 2,
          height - 28,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = "#ffdbac";
        ctx.beginPath();
        ctx.arc(x + width / 2, y + 8, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1f2937";
        ctx.beginPath();
        ctx.arc(x + width / 2, y + 6, 8, Math.PI, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#0f172a";
        ctx.fillRect(x + 8, y + 24, width - 16, 10);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x + 10, y + 26, 6, 6);
        ctx.fillRect(x + 20, y + 26, 6, 6);
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(x + 16, y + 24, 4, 12);

        ctx.strokeStyle = "#111827";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x + 8, y + height - 5);
        ctx.lineTo(x + 2 + stride, y + height + 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + width - 8, y + height - 5);
        ctx.lineTo(x + width + 6 - stride, y + height + 6);
        ctx.stroke();

        ctx.fillStyle = "#2563eb";
        ctx.fillRect(x + 4, y + height - 4, 10, 6);
        ctx.fillRect(x + width - 14, y + height - 4, 10, 6);
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(x + 4, y + height - 1, 10, 3);
        ctx.fillRect(x + width - 14, y + height - 1, 10, 3);

        drawSoccerBall({
          x: x + width + 10,
          y: y + height + 2 + ballRoll,
          radius: 7,
          rotation: ballRoll * 0.3,
        });
      }
    };

    const createObstacle = () => {
      const types = ["cone", "defender", "goalpost", "ball", "flag"];
      const type = types[Math.floor(Math.random() * types.length)];

      let obstacle = {
        x: worldWidth,
        type: type,
        passed: false,
      };

      if (type === "cone") {
        obstacle.width = 28;
        obstacle.height = 30;
        obstacle.y = groundY - obstacle.height;
      } else if (type === "defender") {
        obstacle.width = 36;
        obstacle.height = 60;
        obstacle.y = groundY - obstacle.height;
      } else if (type === "goalpost") {
        obstacle.width = 90;
        obstacle.height = 50;
        obstacle.y = groundY - obstacle.height;
      } else if (type === "ball") {
        obstacle.width = 26;
        obstacle.height = 26;
        const isHigh = Math.random() > 0.5;

        if (isHigh) {
           obstacle.y = groundY - 55; 
        } else {
            obstacle.y = groundY - obstacle.height;
        }
      } else if (type === "flag") {
        obstacle.width = 30;
        obstacle.height = 60;
        obstacle.y = groundY - obstacle.height;
      }

      return obstacle;
    };

    const drawObstacle = (obs) => {
      ctx.shadowBlur = 0;

      if (obs.type === "cone") {
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width / 2, obs.y);
        ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
        ctx.lineTo(obs.x, obs.y + obs.height);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#fdba74";
        ctx.fillRect(obs.x + 6, obs.y + obs.height - 8, obs.width - 12, 5);
      } else if (obs.type === "defender") {
        ctx.fillStyle = "#0f766e";
        ctx.fillRect(obs.x + 6, obs.y + 18, obs.width - 12, obs.height - 18);
        ctx.fillStyle = "#ffdbac";
        ctx.beginPath();
        ctx.arc(obs.x + obs.width / 2, obs.y + 12, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(obs.x + 12, obs.y + obs.height);
        ctx.lineTo(obs.x + 6, obs.y + obs.height + 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width - 12, obs.y + obs.height);
        ctx.lineTo(obs.x + obs.width, obs.y + obs.height + 8);
        ctx.stroke();
      } else if (obs.type === "goalpost") {
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(obs.x + 10, obs.y);
        ctx.lineTo(obs.x + 10, groundY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width - 10, obs.y);
        ctx.lineTo(obs.x + obs.width - 10, groundY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(obs.x + 10, obs.y);
        ctx.lineTo(obs.x + obs.width - 10, obs.y);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(obs.x + 12, obs.y + 10 + i * 12);
          ctx.lineTo(obs.x + obs.width - 12, obs.y + 10 + i * 12);
          ctx.stroke();
        }
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(obs.x + 12 + i * 18, obs.y + 5);
          ctx.lineTo(obs.x + 12 + i * 18, groundY - 5);
          ctx.stroke();
        }
      } else if (obs.type === "ball") {
        drawSoccerBall({
          x: obs.x + obs.width / 2,
          y: obs.y + obs.height / 2,
          radius: obs.width / 2,
          rotation: frameCount * 0.08,
        });
      } else if (obs.type === "flag") {
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(obs.x + 6, obs.y);
        ctx.lineTo(obs.x + 6, groundY);
        ctx.stroke();
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(obs.x + 6, obs.y + 8);
        ctx.lineTo(obs.x + obs.width, obs.y + 16);
        ctx.lineTo(obs.x + 6, obs.y + 24);
        ctx.closePath();
        ctx.fill();
      }
    };

    const isRectCollision = (a, b) => {
      return (
        a.right > b.left &&
        a.left < b.right &&
        a.bottom > b.top &&
        a.top < b.bottom
      );
    };

    const checkCollision = (obs) => {
      const charWidth = character.width;
      const charHeight = character.isDucking
        ? character.height * 0.6
        : character.height;
      const charY = character.isDucking ? groundY - charHeight : character.y;

      const charLeft = character.x + 5;
      const charRight = character.x + charWidth - 5;
      const charTop = charY + 5;
      const charBottom = charY + charHeight - 5;

      if (obs.type === "goalpost") {
        const pillarWidth = 14;
        const topHeight = 12;
        const padding = 6;

        const characterRect = {
          left: charLeft,
          right: charRight,
          top: charTop,
          bottom: charBottom,
        };

        const leftPillar = {
          left: obs.x + padding,
          right: obs.x + padding + pillarWidth,
          top: obs.y + topHeight,
          bottom: groundY,
        };

        const rightPillar = {
          left: obs.x + obs.width - padding - pillarWidth,
          right: obs.x + obs.width - padding,
          top: obs.y + topHeight,
          bottom: groundY,
        };

        const topBar = {
          left: obs.x + padding,
          right: obs.x + obs.width - padding,
          top: obs.y + padding,
          bottom: obs.y + topHeight,
        };

        const hitsPillar =
          !character.isDucking && 
          (isRectCollision(characterRect, leftPillar) ||
           isRectCollision(characterRect, rightPillar));
           
        const hitsTopBar =
          !character.isDucking && isRectCollision(characterRect, topBar);

        return hitsPillar || hitsTopBar;
      }

      const obsLeft = obs.x + 5;
      const obsRight = obs.x + obs.width - 5;
      const obsTop = obs.y + 5;
      const obsBottom = obs.y + obs.height - 5;

      return (
        charRight > obsLeft &&
        charLeft < obsRight &&
        charBottom > obsTop &&
        charTop < obsBottom
      );
    };

    const gameLoop = () => {
      ctx.clearRect(0, 0, worldWidth, worldHeight);
      drawBackground();

      const beatPhase =
        ((performance.now() - beatStartRef.current) % beatIntervalMs) /
        beatIntervalMs;
      const rhythmBoost =
        gameMode === "ritmo" ? 1 + Math.sin(beatPhase * Math.PI * 2) * 0.35 : 1;
      const speedRamp =
        gameMode === "story" ? 0 : Math.min(distance / 2200, 3);
      const currentSpeed = (modeConfig.speed + speedRamp) * rhythmBoost;

      character.velocityY += character.gravity;
      character.y += character.velocityY;

      if (character.y > groundY - character.height) {
        character.y = groundY - character.height;
        character.velocityY = 0;
        character.isJumping = false;
      }

      drawCharacter();
      drawParticles();

      if (
        frameCount %
          Math.floor(modeConfig.obstacleFreq / modeConfig.difficulty) ===
        0
      ) {
        const lastObstacle = obstacles[obstacles.length - 1];
        if (!lastObstacle || lastObstacle.x < worldWidth - 200) {
          obstacles.push(createObstacle());
        }
      }

      obstacles = obstacles.filter((obs) => {
        obs.x -= currentSpeed;
        drawObstacle(obs);

        if (checkCollision(obs)) {
          if (!hasCollided && navigator.vibrate) {
            navigator.vibrate([120, 40, 120]);
            hasCollided = true;
          }
          playHitSound();
          setGameState("gameOver");
          return false;
        }

        if (!obs.passed && obs.x + obs.width < character.x) {
          obs.passed = true;
          setScore((prev) => prev + 10);
          spawnSpark();
        }

        return obs.x + obs.width > -50;
      });

      distance += currentSpeed;

      const hudX = 16;
      const hudY = 16;
      const hudWidth = 220;
      const hudHeight = 94;

      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(hudX, hudY, hudWidth, hudHeight);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px Arial";
      ctx.fillText(`📏 ${Math.floor(distance)}m`, hudX + 12, hudY + 32);

      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 24px Arial";
      ctx.fillText(`🥅 ${score}`, hudX + 12, hudY + 60);

      ctx.fillStyle = "#a5b4fc";
      ctx.font = "bold 14px Arial";
      ctx.fillText(
        `${gameMode === "story" ? "Historia" : modeConfig.name} · ${bpm} BPM`,
        hudX + 12,
        hudY + 78
      );

      frameCount++;

      if (gameMode === "story" && distance >= levelDistance) {
        const newUnlocked = [...unlockedLevels];
        if (!newUnlocked.includes(currentLevel)) {
          newUnlocked.push(currentLevel);
          setUnlockedLevels(newUnlocked);
          localStorage.setItem(
            "reyesMagosProgress",
            JSON.stringify(newUnlocked)
          );
        }
        setGameState("levelComplete");
        return;
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    window.addEventListener("resize", resizeCanvas);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("pointerdown", handlePressStart);
      canvas.removeEventListener("pointerup", handlePressEnd);
      canvas.removeEventListener("pointercancel", handlePressEnd);
      window.removeEventListener("resize", resizeCanvas);
      clearTimeout(pressTimeout);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, currentLevel, unlockedLevels, gameMode]);

  const startLevel = (level) => {
    setCurrentLevel(level);
    setScore(0);
    setGameMode("story");
    startMusic("story");
    setGameState("playing");
  };

  const resetProgress = () => {
    localStorage.removeItem("reyesMagosProgress");
    setUnlockedLevels([]);
    setCurrentLevel(1);
    setGameState("menu");
  };

  const renderMapOverlay = isMapOpen ? (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <button
        type="button"
        onClick={() => setIsMapOpen(false)}
        className="absolute top-4 right-4 px-4 py-2 bg-white text-gray-900 rounded-full font-bold shadow-lg hover:bg-gray-100"
      >
        ✕ Cerrar
      </button>
      <img
        src={mapImagePath}
        alt="Mapa completo de los Reyes Magos"
        className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl"
      />
    </div>
  ) : null;

  if (gameState === "menu") {
    return (
      <>
        <div className="w-full min-h-screen bg-gradient-to-b from-blue-900 via-purple-900 to-blue-900 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8 max-w-2xl w-full border-4 border-yellow-400">
<div className="text-center mb-5 sm:mb-6">
  {/* Contenedor flex para alinear balones y título */}
  <div className="flex items-center justify-center gap-4 mb-2">
    <span className="text-4xl sm:text-6xl">⚽</span>
    
    <h1 className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-yellow-500 via-red-600 to-purple-600 bg-clip-text text-transparent">
      DESAFÍO FUTBOLERO
    </h1>
    
    <span className="text-4xl sm:text-6xl">⚽</span>
  </div>

  <p className="text-base sm:text-xl text-purple-700 font-semibold">
    Carrera de obstáculos de los Reyes Magos
  </p>
</div>

          <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-yellow-50 to-red-50 border-3 border-yellow-400 rounded-xl shadow-inner">
            <h2 className="font-bold text-lg sm:text-xl mb-3 text-red-700">
              🎮 Cómo Jugar:
            </h2>
            <ul className="text-sm sm:text-base space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-2xl">⬆️</span>
                <kbd className="px-2 sm:px-3 py-1 bg-white border-2 border-gray-300 rounded-lg shadow">
                  ESPACIO
                </kbd>{" "}
                o
                <kbd className="px-2 sm:px-3 py-1 bg-white border-2 border-gray-300 rounded-lg shadow">
                  ↑
                </kbd>{" "}
                o<strong className="text-blue-600">TOQUE</strong> = Saltar
              </li>
              <li className="flex items-center gap-2">
                <span className="text-2xl">⬇️</span>
                <kbd className="px-2 sm:px-3 py-1 bg-white border-2 border-gray-300 rounded-lg shadow">
                  ↓
                </kbd>{" "}
                = Agacharse (mantén pulsado en móvil) (para porterías)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                <span>Esquiva conos, defensas y banderines</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-2xl">🗺️</span>
                <span>Supera fases para desbloquear pistas del torneo</span>
              </li>
            </ul>
          </div>

          <div className="mb-6">
              <div className="space-y-3">
                {levels.map((level, index) => {
                  const levelNum = index + 1;
                  const isUnlocked =
                    levelNum === 1 || unlockedLevels.includes(levelNum - 1);
                  const isCompleted = unlockedLevels.includes(levelNum);

                  return (
                    <button
                      key={levelNum}
                      onClick={() => isUnlocked && startLevel(levelNum)}
                      disabled={!isUnlocked}
                      className={`w-full p-3 sm:p-4 rounded-xl font-bold text-base sm:text-lg transition-all transform hover:scale-105 shadow-lg ${
                        isCompleted
                          ? "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
                          : isUnlocked
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>
                          Nivel {levelNum}: {level.name}
                        </span>
                        {isCompleted && <Trophy className="w-6 h-6" />}
                        {!isUnlocked && <span>🔒</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
          </div>

          {unlockedLevels.length > 0 && (
            <div className="mb-4 p-4 sm:p-5 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-400 rounded-xl shadow-lg">
              <h3 className="font-bold text-lg sm:text-xl mb-3 text-amber-800 flex items-center gap-2">
                🗺️ Pistas Desbloqueadas:
              </h3>
              <div className="space-y-2">
                {unlockedLevels
                  .sort((a, b) => a - b)
                  .map((level) => (
                    <div
                      key={level}
                      className="p-3 sm:p-4 bg-white rounded-lg border-2 border-amber-200 shadow"
                    >
                      <p className="text-sm sm:text-base font-mono">
                        {treasureClues[level]}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {allLevelsCompleted && (
            <div className="mb-4 p-4 sm:p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-xl shadow-lg">
              <h3 className="font-bold text-lg sm:text-xl mb-2 text-emerald-800">
                🗺️ Mapa Completo Desbloqueado
              </h3>
              <p className="text-sm sm:text-base text-emerald-900 mb-3">
                Has terminado todas las fases. Puedes abrir el mapa en pantalla
                completa.
              </p>
              <button
                type="button"
                onClick={() => setIsMapOpen(true)}
                className="text-emerald-700 font-semibold underline underline-offset-4 hover:text-emerald-900"
              >
                Ver mapa a pantalla completa
              </button>
            </div>
          )}

          {unlockedLevels.length > 0 && (
            <button
              onClick={resetProgress}
              className="w-full p-3 sm:p-4 bg-red-500 text-white rounded-xl hover:bg-red-600 flex items-center justify-center gap-2 font-bold text-sm sm:text-base shadow-lg"
            >
              <RotateCcw className="w-5 h-5" />
              Reiniciar Temporada
            </button>
          )}
        </div>
      </div>
        {renderMapOverlay}
      </>
    );
  }

  if (gameState === "levelComplete") {
    return (
      <>
        <div className="w-full h-screen bg-gradient-to-b from-green-600 via-emerald-700 to-green-800 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-4 border-yellow-400">
            <Trophy className="w-20 h-20 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-3xl font-bold text-green-600 mb-2">
              ¡Fase Superada!
            </h2>
            <p className="text-xl mb-4">Marcador Final: {score}</p>

            <div className="bg-yellow-50 p-4 rounded-xl border-2 border-yellow-200 mb-6">
              <h3 className="font-bold text-yellow-800 mb-2">
                📜 Pista Desbloqueada:
              </h3>
              <p className="text-lg italic font-serif text-gray-700">
                {treasureClues[currentLevel]}
              </p>
            </div>

            {allLevelsCompleted && (
              <div className="bg-emerald-50 p-4 rounded-xl border-2 border-emerald-200 mb-6">
                <h3 className="font-bold text-emerald-700 mb-2">
                  🗺️ Mapa Completo
                </h3>
                <p className="text-sm text-emerald-800 mb-3">
                  Has completado todos los niveles. El mapa está listo.
                </p>
                <button
                  type="button"
                  onClick={() => setIsMapOpen(true)}
                  className="text-emerald-700 font-semibold underline underline-offset-4 hover:text-emerald-900"
                >
                  Ver mapa a pantalla completa
                </button>
              </div>
            )}

            <button
              onClick={() => setGameState("menu")}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg"
            >
              Volver al Menu
            </button>
          </div>
        </div>
        {renderMapOverlay}
      </>
    );
  }

  if (gameState === "gameOver") {
    return (
      <div className="w-full h-screen bg-gradient-to-b from-red-900 via-red-800 to-black flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-4 border-red-500">
          <div className="text-6xl mb-4">⚽</div>
          <h2 className="text-4xl font-bold text-red-600 mb-2">¡Falta!</h2>
          <p className="text-gray-600 mb-6">
            Te has estrellado en el entrenamiento.
          </p>
          <p className="text-2xl font-bold mb-8">Marcador: {score}</p>

          <div className="space-y-3">
            <button
              onClick={() => startLevel(currentLevel)}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition shadow-lg flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Intentar de Nuevo
            </button>
            <button
              onClick={() => setGameState("menu")}
              className="w-full py-3 bg-gray-500 text-white rounded-xl font-bold text-lg hover:bg-gray-600 transition shadow-lg"
            >
              Volver al Menú
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Renderizado del juego (Canvas) cuando gameState === 'playing'
  return (
    <div className="w-full h-screen bg-gray-900 flex items-center justify-center overflow-hidden relative">
      <canvas
        ref={canvasRef}
        className="shadow-2xl rounded-lg bg-gray-800 touch-none"
        style={{ maxWidth: "100%", maxHeight: "100%" }}
      />
    </div>
  );
};

export default ReyesMagosDashGame;
