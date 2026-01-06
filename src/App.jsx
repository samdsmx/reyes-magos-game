import React, { useState, useEffect, useRef } from "react";
import { Trophy, RotateCcw } from "lucide-react";

const ReyesMagosDashGame = () => {
  const canvasRef = useRef(null);
  const controlsRef = useRef({ jump: () => { }, duck: () => { } });
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
      speed: 3.5,
      obstacleFreq: 110,
      difficulty: 0.55,
    },
    {
      name: "Fase de Grupos",
      speed: 4,
      obstacleFreq: 105,
      difficulty: 0.65,
    },
    {
      name: "Octavos de Final",
      speed: 4.5,
      obstacleFreq: 100,
      difficulty: 0.75,
    },
    { name: "Semifinal", speed: 5, obstacleFreq: 95, difficulty: 0.85 },
    { name: "La Gran Final", speed: 5.5, obstacleFreq: 90, difficulty: 0.95 },
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
      jumpPower: -12,
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
    const levelDistance = 10000;
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
      const fontSize = radius * 2.3;

      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "black";
      ctx.fillText("⚽", 0, 0);

      ctx.restore();
    };

    const drawCharacter = () => {
      const x = character.x;
      // Ajustamos la posición Y para el dibujo
      const drawY = character.isDucking ? groundY - 25 : character.y;

      const colors = {
        skin: "#ffdbac",
        hair: "#2d1a12",
        shirtMain: "#6CACE4", // Celeste (Argentina)
        shirtSec: "#FFFFFF",
        shorts: "#000000",
        socks: "#FFFFFF",
        boots: "#000000"
      };

      const isRunning = !character.isJumping && !character.isDucking;
      const swing = isRunning ? Math.sin(frameCount * 0.3) * 10 : 0;
      const bounce = isRunning ? Math.abs(Math.sin(frameCount * 0.3)) * 3 : 0;
      const finalY = drawY - bounce;

      ctx.save();

      if (character.isDucking) {
        // --- POSE DE DESLIZAMIENTO (Mirando a la DERECHA) ---

        // 1. Pierna izquierda (doblada atrás)
        ctx.fillStyle = colors.shorts;
        ctx.fillRect(x - 5, groundY - 15, 12, 10);

        // 2. Pierna derecha (estirada adelante hacia el balón)
        ctx.fillStyle = colors.skin;
        ctx.fillRect(x + 20, groundY - 10, 15, 6);
        ctx.fillStyle = colors.boots;
        ctx.fillRect(x + 35, groundY - 12, 8, 8);

        // 3. Torso (inclinado atrás)
        ctx.fillStyle = colors.shirtMain;
        ctx.fillRect(x, groundY - 25, 25, 14);
        ctx.fillStyle = colors.shirtSec;
        ctx.fillRect(x + 10, groundY - 25, 5, 14);

        // 4. Cabeza (Mirando a la derecha)
        ctx.fillStyle = colors.skin;
        ctx.fillRect(x + 5, groundY - 35, 14, 12);

        // Pelo (Nuca a la IZQUIERDA, Frente a la DERECHA)
        ctx.fillStyle = colors.hair;
        ctx.fillRect(x + 3, groundY - 37, 16, 4); // Parte de arriba
        ctx.fillRect(x + 3, groundY - 35, 4, 8);  // Nuca (izquierda)

        // Ojo (a la derecha)
        ctx.fillStyle = "#000";
        ctx.fillRect(x + 15, groundY - 32, 2, 2);

        // Balón
        drawSoccerBall({
          x: x + 48,
          y: groundY - 10,
          radius: 6,
          rotation: frameCount * 0.2,
        });

      } else {
        // --- POSE DE CORRER (Mirando a la DERECHA) ---

        // 1. BRAZO TRASERO (Izquierda)
        ctx.fillStyle = colors.skin;
        ctx.fillRect(x + 12 - swing, finalY + 15, 6, 14);

        // 2. PIERNA TRASERA
        const legRX = x + 10 + swing;
        ctx.fillStyle = colors.shorts;
        ctx.fillRect(x + 10, finalY + 25, 14, 6);
        ctx.fillStyle = colors.skin;
        ctx.fillRect(legRX, finalY + 28, 7, 8);
        ctx.fillStyle = colors.socks;
        ctx.fillRect(legRX, finalY + 36, 7, 6);
        ctx.fillStyle = colors.boots;
        ctx.fillRect(legRX - 2, finalY + 42, 11, 5);

        // 3. CUERPO
        ctx.fillStyle = colors.shirtMain;
        ctx.fillRect(x + 5, finalY + 8, 24, 20);
        ctx.fillStyle = colors.shirtSec;
        ctx.fillRect(x + 15, finalY + 8, 6, 20);

        // 4. CABEZA (CORREGIDA)
        ctx.fillStyle = colors.skin;
        ctx.fillRect(x + 8, finalY - 8, 18, 18); // Cara base

        // Pelo
        ctx.fillStyle = colors.hair;
        ctx.fillRect(x + 6, finalY - 10, 22, 6); // Parte superior
        ctx.fillRect(x + 6, finalY - 4, 5, 10);  // Nuca/Patilla trasera (IZQUIERDA)

        // Ojo (Punto negro a la DERECHA para indicar mirada)
        ctx.fillStyle = "#000";
        ctx.fillRect(x + 22, finalY - 2, 2, 2);

        // 5. PIERNA DELANTERA
        const legLX = x + 10 - swing;
        ctx.fillStyle = colors.skin;
        ctx.fillRect(legLX, finalY + 28, 7, 8);
        ctx.fillStyle = colors.socks;
        ctx.fillRect(legLX, finalY + 36, 7, 6);
        ctx.fillStyle = colors.boots;
        ctx.fillRect(legLX + 2, finalY + 42, 11, 5); // Botín apuntando a derecha

        // 6. BRAZO DELANTERO
        ctx.fillStyle = colors.skin;
        ctx.fillRect(x + 14 + swing, finalY + 15, 6, 14);

        // BALÓN
        const ballRoll = Math.sin(frameCount * 0.4) * 2;
        drawSoccerBall({
          x: x + 40,
          y: character.y + character.height - 5,
          radius: 7,
          rotation: ballRoll * 0.3,
        });
      }

      ctx.restore();
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
        obstacle.width = 120;
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
        const x = obs.x;
        // Calculamos la posición Y con un pequeño rebote (más lento que correr)
        // para que parezca que está trotando o esperando.
        const bounce = Math.abs(Math.sin(frameCount * 0.1)) * 2;
        const swing = Math.sin(frameCount * 0.1) * 5;
        const drawY = obs.y - bounce + 10;

        // COLORES (Equipo Rival - Rojo y Blanco)
        const defColors = {
          skin: "#e0ac69",      // Piel un poco más oscura
          hair: "#1a1a1a",      // Pelo negro
          shirt: "#ef4444",     // Camiseta Roja
          shorts: "#ffffff",    // Pantalón Blanco
          socks: "#ef4444",     // Medias Rojas
          boots: "#111827"      // Botines negros
        };

        ctx.save();

        // 1. BRAZO TRASERO (El que se ve por detrás)
        ctx.fillStyle = defColors.skin;
        ctx.fillRect(x + 20 + swing, drawY + 18, 6, 14);

        // 2. PIERNA TRASERA
        const legBackX = x + 14 - swing;
        ctx.fillStyle = defColors.skin;
        ctx.fillRect(legBackX, drawY + 30, 7, 8); // Muslo
        ctx.fillStyle = defColors.socks;
        ctx.fillRect(legBackX, drawY + 38, 7, 8); // Media
        ctx.fillStyle = defColors.boots;
        ctx.fillRect(legBackX - 4, drawY + 46, 11, 5); // Botín apuntando izquierda

        // 3. TORSO (Cuerpo)
        ctx.fillStyle = defColors.shirt;
        ctx.fillRect(x + 8, drawY + 10, 24, 22); // Camiseta
        ctx.fillStyle = defColors.shorts;
        ctx.fillRect(x + 8, drawY + 32, 24, 8);  // Shorts

        // Detalle camiseta (Franja vertical oscura)
        ctx.fillStyle = "#b91c1c";
        ctx.fillRect(x + 18, drawY + 10, 4, 22);

        // 4. CABEZA (Mirando a la IZQUIERDA <- hacia el jugador)
        ctx.fillStyle = defColors.skin;
        ctx.fillRect(x + 10, drawY - 6, 18, 18); // Cara

        // Pelo
        ctx.fillStyle = defColors.hair;
        ctx.fillRect(x + 8, drawY - 8, 22, 6); // Parte superior
        ctx.fillRect(x + 24, drawY - 4, 6, 10); // Nuca (está a la derecha porque mira a la izq)

        // Ojo (Mirando al jugador a la izquierda)
        ctx.fillStyle = "#000";
        ctx.fillRect(x + 12, drawY, 2, 2);

        // Ceño fruncido (Ceja para que se vea enojado/competitivo)
        ctx.fillStyle = defColors.hair;
        ctx.fillRect(x + 11, drawY - 2, 5, 2);

        // 5. PIERNA DELANTERA (La más cercana a la pantalla)
        const legFrontX = x + 14 + swing;
        ctx.fillStyle = defColors.skin;
        ctx.fillRect(legFrontX, drawY + 30, 7, 8);
        ctx.fillStyle = defColors.socks;
        ctx.fillRect(legFrontX, drawY + 38, 7, 8);
        ctx.fillStyle = defColors.boots;
        ctx.fillRect(legFrontX - 4, drawY + 46, 11, 5);

        // 6. BRAZO DELANTERO
        ctx.fillStyle = defColors.skin;
        ctx.fillRect(x + 10 - swing, drawY + 18, 6, 14);

        ctx.restore();


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

      } else if (obs.type === "ball") {
        drawSoccerBall({
          x: obs.x + obs.width / 2,
          y: obs.y + obs.height / 2,
          radius: obs.width / 2,
          rotation: frameCount * 0.08,
        });
      } else if (obs.type === "flag") {
        ctx.save();
        
        // Ajustamos el tamaño basado en la altura del obstáculo
        const fontSize = obs.height; 
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        
        // "bottom" es clave aquí: dibuja el emoji desde los pies hacia arriba
        // para que quede perfectamente apoyado en el suelo.
        ctx.textBaseline = "bottom"; 
        
        // Importante: Reseteamos el color para evitar transparencias accidentales
        ctx.fillStyle = "black"; 
        
        // Dibujamos el emoji centrado en el ancho del obstáculo y pegado al suelo (groundY)
        ctx.fillText("🚩", obs.x + obs.width / 2, groundY + 10);
        
        ctx.restore();
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
      const hudWidth = 160;
      const hudHeight = 50;

      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(hudX, hudY, hudWidth, hudHeight);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px Arial";
      ctx.fillText(`📏 ${Math.floor(distance)}m`, hudX + 12, hudY + 32);

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
                      className={`w-full p-3 sm:p-4 rounded-xl font-bold text-base sm:text-lg transition-all transform hover:scale-105 shadow-lg ${isCompleted
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
                  Has terminado todas las fases. Abre el mapa y colecta las 4 pistas.
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
