import React, { useState, useEffect, useRef } from "react";
import { Trophy, RotateCcw } from "lucide-react";

const ReyesMagosDashGame = () => {
  const canvasRef = useRef(null);
  const controlsRef = useRef({ jump: () => {}, duck: () => {} });
  const [gameState, setGameState] = useState("menu");
  const [currentLevel, setCurrentLevel] = useState(1);
  const [unlockedLevels, setUnlockedLevels] = useState([]);
  const [score, setScore] = useState(0);
  const gameLoopRef = useRef(null);

  const treasureClues = {
    1: "🏟️ PISTA 1: Calienta en el Estadio Central, cerca de la banca.",
    2: "⚽ PISTA 2: Dribla por la banda y busca junto al banderín.",
    3: "🎯 PISTA 3: Practica pases cortos junto al círculo central.",
    4: "🥅 PISTA 4: La pista está detrás de la portería norte.",
    5: "🏆 PISTA 5: ¡Celebración en la final! La copa te guía.",
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

  useEffect(() => {
    const saved = localStorage.getItem("reyesMagosProgress");
    if (saved) {
      setUnlockedLevels(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (gameState !== "playing") return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const baseCanvas = { width: 1000, height: 500 };
    const baseGroundY = 430;
    const baseLevelDistance = 5000;
    let scaleFactor = 1;
    let groundY = baseGroundY;
    let levelDistance = baseLevelDistance;
    let displayWidth = baseCanvas.width;
    let displayHeight = baseCanvas.height;

    const getScaleFactor = () =>
      Math.min(
        window.innerWidth / baseCanvas.width,
        window.innerHeight / baseCanvas.height
      );

    const scaleValue = (value) => value * scaleFactor;

    const levelConfig = levels[currentLevel - 1];

    let character = null;

    let obstacles = [];
    let stars = [];
    let frameCount = 0;
    let distance = 0;
    let hasCollided = false;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const newScaleFactor = getScaleFactor();
      displayWidth = Math.round(baseCanvas.width * newScaleFactor);
      displayHeight = Math.round(baseCanvas.height * newScaleFactor);

      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      canvas.width = Math.round(displayWidth * dpr);
      canvas.height = Math.round(displayHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!character) {
        scaleFactor = newScaleFactor;
        groundY = baseGroundY * scaleFactor;
        levelDistance = baseLevelDistance * scaleFactor;
        return;
      }

      const ratio = newScaleFactor / scaleFactor;
      scaleFactor = newScaleFactor;
      groundY = baseGroundY * scaleFactor;
      levelDistance = baseLevelDistance * scaleFactor;

      character = {
        ...character,
        x: character.x * ratio,
        y: character.y * ratio,
        width: character.width * ratio,
        height: character.height * ratio,
        velocityY: character.velocityY * ratio,
        gravity: character.gravity * ratio,
        jumpPower: character.jumpPower * ratio,
      };

      obstacles = obstacles.map((obs) => ({
        ...obs,
        x: obs.x * ratio,
        y: obs.y * ratio,
        width: obs.width * ratio,
        height: obs.height * ratio,
      }));

      stars = stars.map((star) => ({
        ...star,
        x: star.x * ratio,
        y: star.y * ratio,
        size: star.size * ratio,
        speed: star.speed * ratio,
      }));

      distance *= ratio;
    };

    resizeCanvas();

    character = {
      x: scaleValue(120),
      y: scaleValue(380),
      width: scaleValue(35),
      height: scaleValue(45),
      velocityY: 0,
      gravity: scaleValue(0.7),
      jumpPower: scaleValue(-13),
      isJumping: false,
      isDucking: false,
    };

    for (let i = 0; i < 50; i++) {
      stars.push({
        x: Math.random() * displayWidth,
        y: Math.random() * (groundY - scaleValue(50)),
        size: scaleValue(Math.random() * 2 + 1),
        speed: scaleValue(Math.random() * 0.5 + 0.2),
      });
    }

    const jump = () => {
      if (!character.isJumping && !character.isDucking) {
        character.velocityY = character.jumpPower;
        character.isJumping = true;
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

    const handleResize = () => resizeCanvas();

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    window.addEventListener("resize", handleResize);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("pointerdown", handlePressStart);
    canvas.addEventListener("pointerup", handlePressEnd);
    canvas.addEventListener("pointercancel", handlePressEnd);

    controlsRef.current = { jump, duck };

    const drawBackground = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, groundY);
      gradient.addColorStop(0, "#0a0e27");
      gradient.addColorStop(0.5, "#1a1f4d");
      gradient.addColorStop(1, "#2d3561");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, displayWidth, groundY);

      stars.forEach((star) => {
        star.x -= star.speed;
        if (star.x < 0) star.x = displayWidth;

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
      ctx.shadowBlur = scaleValue(30);
      ctx.shadowColor = "#f4e4c1";
      ctx.beginPath();
      ctx.arc(scaleValue(850), scaleValue(80), scaleValue(40), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      const groundGradient = ctx.createLinearGradient(
        0,
        groundY,
        0,
        displayHeight
      );
      groundGradient.addColorStop(0, "#d4a574");
      groundGradient.addColorStop(1, "#b8885a");
      ctx.fillStyle = groundGradient;
      ctx.fillRect(0, groundY, displayWidth, displayHeight - groundY);

      ctx.fillStyle = "rgba(210, 180, 140, 0.3)";
      ctx.beginPath();
      ctx.ellipse(
        scaleValue(200) - (distance % scaleValue(400)),
        groundY + scaleValue(10),
        scaleValue(100),
        scaleValue(20),
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(
        scaleValue(600) - (distance % scaleValue(400)),
        groundY + scaleValue(15),
        scaleValue(120),
        scaleValue(25),
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    };

    const drawCharacter = () => {
      const x = character.x;
      const y = character.isDucking ? groundY - scaleValue(25) : character.y;
      const height = character.isDucking
        ? character.height * 0.6
        : character.height;
      const width = character.width;
      const stride = Math.sin(frameCount * 0.2) * scaleValue(6);
      const ballRoll = Math.sin(frameCount * 0.4) * scaleValue(2);

      if (character.isDucking) {
        ctx.fillStyle = "#1e3a8a";
        ctx.fillRect(
          x + scaleValue(2),
          y + scaleValue(6),
          width + scaleValue(6),
          height - scaleValue(6)
        );

        ctx.fillStyle = "#ffdbac";
        ctx.beginPath();
        ctx.arc(
          x + scaleValue(18),
          y + scaleValue(4),
          scaleValue(6),
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = "#0f172a";
        ctx.fillRect(
          x + scaleValue(6),
          y + scaleValue(18),
          scaleValue(20),
          scaleValue(8)
        );
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(
          x + scaleValue(8),
          y + scaleValue(20),
          scaleValue(6),
          scaleValue(6)
        );
        ctx.fillRect(
          x + scaleValue(18),
          y + scaleValue(20),
          scaleValue(6),
          scaleValue(6)
        );

        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.moveTo(x + scaleValue(4), y + height);
        ctx.lineTo(x + scaleValue(28), y + height);
        ctx.lineTo(x + scaleValue(16), y + height - scaleValue(8));
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(
          x + scaleValue(34),
          y + height - scaleValue(6),
          scaleValue(6),
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = scaleValue(1);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(
          x + scaleValue(34),
          y + height - scaleValue(6),
          scaleValue(2),
          0,
          Math.PI * 2
        );
        ctx.stroke();
      } else {
        ctx.fillStyle = "#1e3a8a";
        ctx.beginPath();
        ctx.ellipse(
          x + width / 2,
          y + scaleValue(20),
          width / 2 + scaleValue(4),
          height - scaleValue(20),
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = "#ffdbac";
        ctx.beginPath();
        ctx.arc(
          x + width / 2,
          y + scaleValue(8),
          scaleValue(8),
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = "#0f172a";
        ctx.fillRect(
          x + scaleValue(8),
          y + scaleValue(24),
          width - scaleValue(16),
          scaleValue(10)
        );
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(
          x + scaleValue(10),
          y + scaleValue(26),
          scaleValue(6),
          scaleValue(6)
        );
        ctx.fillRect(
          x + scaleValue(20),
          y + scaleValue(26),
          scaleValue(6),
          scaleValue(6)
        );

        ctx.strokeStyle = "#111827";
        ctx.lineWidth = scaleValue(4);
        ctx.beginPath();
        ctx.moveTo(x + scaleValue(8), y + height - scaleValue(5));
        ctx.lineTo(
          x + scaleValue(2) + stride,
          y + height + scaleValue(8)
        );
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + width - scaleValue(8), y + height - scaleValue(5));
        ctx.lineTo(
          x + width + scaleValue(6) - stride,
          y + height + scaleValue(6)
        );
        ctx.stroke();

        ctx.fillStyle = "#2563eb";
        ctx.fillRect(
          x + scaleValue(4),
          y + height - scaleValue(4),
          scaleValue(10),
          scaleValue(6)
        );
        ctx.fillRect(
          x + width - scaleValue(14),
          y + height - scaleValue(4),
          scaleValue(10),
          scaleValue(6)
        );

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(
          x + width + scaleValue(10),
          y + height + scaleValue(2) + ballRoll,
          scaleValue(7),
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.strokeStyle = "#111827";
        ctx.lineWidth = scaleValue(1.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(
          x + width + scaleValue(10),
          y + height + scaleValue(2) + ballRoll,
          scaleValue(2.5),
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
    };

    const createObstacle = () => {
      const types = ["cone", "defender", "goalpost", "ball", "flag"];
      const type = types[Math.floor(Math.random() * types.length)];

      let obstacle = {
        x: displayWidth,
        type: type,
        passed: false,
      };

      if (type === "cone") {
        obstacle.width = scaleValue(28);
        obstacle.height = scaleValue(30);
        obstacle.y = groundY - obstacle.height;
      } else if (type === "defender") {
        obstacle.width = scaleValue(36);
        obstacle.height = scaleValue(60);
        obstacle.y = groundY - obstacle.height;
      } else if (type === "goalpost") {
        obstacle.width = scaleValue(90);
        obstacle.height = scaleValue(70);
        obstacle.y = groundY - obstacle.height;
      } else if (type === "ball") {
        obstacle.width = scaleValue(26);
        obstacle.height = scaleValue(26);
        obstacle.y = groundY - obstacle.height;
      } else if (type === "flag") {
        obstacle.width = scaleValue(30);
        obstacle.height = scaleValue(60);
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
        ctx.fillRect(
          obs.x + scaleValue(6),
          obs.y + obs.height - scaleValue(8),
          obs.width - scaleValue(12),
          scaleValue(5)
        );
      } else if (obs.type === "defender") {
        ctx.fillStyle = "#0f766e";
        ctx.fillRect(
          obs.x + scaleValue(6),
          obs.y + scaleValue(18),
          obs.width - scaleValue(12),
          obs.height - scaleValue(18)
        );
        ctx.fillStyle = "#ffdbac";
        ctx.beginPath();
        ctx.arc(
          obs.x + obs.width / 2,
          obs.y + scaleValue(12),
          scaleValue(8),
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = scaleValue(4);
        ctx.beginPath();
        ctx.moveTo(obs.x + scaleValue(12), obs.y + obs.height);
        ctx.lineTo(
          obs.x + scaleValue(6),
          obs.y + obs.height + scaleValue(8)
        );
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width - scaleValue(12), obs.y + obs.height);
        ctx.lineTo(obs.x + obs.width, obs.y + obs.height + scaleValue(8));
        ctx.stroke();
      } else if (obs.type === "goalpost") {
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = scaleValue(6);
        ctx.beginPath();
        ctx.moveTo(obs.x + scaleValue(10), obs.y);
        ctx.lineTo(obs.x + scaleValue(10), groundY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width - scaleValue(10), obs.y);
        ctx.lineTo(obs.x + obs.width - scaleValue(10), groundY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(obs.x + scaleValue(10), obs.y);
        ctx.lineTo(obs.x + obs.width - scaleValue(10), obs.y);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = scaleValue(1);
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(
            obs.x + scaleValue(12),
            obs.y + scaleValue(10) + i * scaleValue(12)
          );
          ctx.lineTo(
            obs.x + obs.width - scaleValue(12),
            obs.y + scaleValue(10) + i * scaleValue(12)
          );
          ctx.stroke();
        }
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(
            obs.x + scaleValue(12) + i * scaleValue(18),
            obs.y + scaleValue(5)
          );
          ctx.lineTo(
            obs.x + scaleValue(12) + i * scaleValue(18),
            groundY - scaleValue(5)
          );
          ctx.stroke();
        }
      } else if (obs.type === "ball") {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(
          obs.x + obs.width / 2,
          obs.y + obs.height / 2,
          obs.width / 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.strokeStyle = "#111827";
        ctx.lineWidth = scaleValue(1.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(
          obs.x + obs.width / 2,
          obs.y + obs.height / 2,
          obs.width / 5,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      } else if (obs.type === "flag") {
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = scaleValue(3);
        ctx.beginPath();
        ctx.moveTo(obs.x + scaleValue(6), obs.y);
        ctx.lineTo(obs.x + scaleValue(6), groundY);
        ctx.stroke();
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(obs.x + scaleValue(6), obs.y + scaleValue(8));
        ctx.lineTo(obs.x + obs.width, obs.y + scaleValue(16));
        ctx.lineTo(obs.x + scaleValue(6), obs.y + scaleValue(24));
        ctx.closePath();
        ctx.fill();
      }
    };

    const checkCollision = (obs) => {
      const charWidth = character.width;
      const charHeight = character.isDucking
        ? character.height * 0.6
        : character.height;
      const charY = character.isDucking ? groundY - charHeight : character.y;

      const collisionInset = scaleValue(5);
      const charLeft = character.x + collisionInset;
      const charRight = character.x + charWidth - collisionInset;
      const charTop = charY + collisionInset;
      const charBottom = charY + charHeight - collisionInset;

      const obsLeft = obs.x + collisionInset;
      const obsRight = obs.x + obs.width - collisionInset;
      const obsTop = obs.y + collisionInset;
      const obsBottom = obs.y + obs.height - collisionInset;

      return (
        charRight > obsLeft &&
        charLeft < obsRight &&
        charBottom > obsTop &&
        charTop < obsBottom
      );
    };

    const gameLoop = () => {
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      drawBackground();

      character.velocityY += character.gravity;
      character.y += character.velocityY;

      if (character.y > groundY - character.height) {
        character.y = groundY - character.height;
        character.velocityY = 0;
        character.isJumping = false;
      }

      drawCharacter();

      if (
        frameCount %
          Math.floor(levelConfig.obstacleFreq / levelConfig.difficulty) ===
        0
      ) {
        const lastObstacle = obstacles[obstacles.length - 1];
        if (!lastObstacle || lastObstacle.x < displayWidth - scaleValue(200)) {
          obstacles.push(createObstacle());
        }
      }

      obstacles = obstacles.filter((obs) => {
        const scaledSpeed = levelConfig.speed * scaleFactor;
        obs.x -= scaledSpeed;
        drawObstacle(obs);

        if (checkCollision(obs)) {
          if (!hasCollided && navigator.vibrate) {
            navigator.vibrate([120, 40, 120]);
            hasCollided = true;
          }
          setGameState("gameOver");
          return false;
        }

        if (!obs.passed && obs.x + obs.width < character.x) {
          obs.passed = true;
          setScore((prev) => prev + 10);
        }

        return obs.x + obs.width > -scaleValue(50);
      });

      distance += levelConfig.speed * scaleFactor;

      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(
        scaleValue(10),
        scaleValue(10),
        scaleValue(280),
        scaleValue(110)
      );

      ctx.fillStyle = "#ffd700";
      ctx.font = `bold ${scaleValue(22)}px Arial`;
      ctx.fillText(
        `⚽ ${levels[currentLevel - 1].name}`,
        scaleValue(20),
        scaleValue(35)
      );

      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${scaleValue(18)}px Arial`;
      ctx.fillText(
        `📏 Distancia: ${Math.floor(distance)}/${levelDistance}`,
        scaleValue(20),
        scaleValue(60)
      );
      ctx.fillText(`🥅 Goles: ${score}`, scaleValue(20), scaleValue(85));

      ctx.fillStyle = "#1a1f4d";
      ctx.fillRect(
        scaleValue(20),
        scaleValue(95),
        scaleValue(260),
        scaleValue(20)
      );

      const progress = (distance / levelDistance) * scaleValue(260);
      const progressGradient = ctx.createLinearGradient(
        scaleValue(20),
        scaleValue(95),
        scaleValue(20) + progress,
        scaleValue(95)
      );
      progressGradient.addColorStop(0, "#ffd700");
      progressGradient.addColorStop(0.5, "#ff6347");
      progressGradient.addColorStop(1, "#c41e3a");
      ctx.fillStyle = progressGradient;
      ctx.fillRect(scaleValue(20), scaleValue(95), progress, scaleValue(20));

      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = scaleValue(2);
      ctx.strokeRect(
        scaleValue(20),
        scaleValue(95),
        scaleValue(260),
        scaleValue(20)
      );

      frameCount++;

      if (distance >= levelDistance) {
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

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("pointerdown", handlePressStart);
      canvas.removeEventListener("pointerup", handlePressEnd);
      canvas.removeEventListener("pointercancel", handlePressEnd);
      clearTimeout(pressTimeout);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, currentLevel, unlockedLevels]);

  const startLevel = (level) => {
    setCurrentLevel(level);
    setScore(0);
    setGameState("playing");
  };

  const resetProgress = () => {
    localStorage.removeItem("reyesMagosProgress");
    setUnlockedLevels([]);
    setCurrentLevel(1);
    setGameState("menu");
  };

  if (gameState === "menu") {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-blue-900 via-purple-900 to-blue-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full border-4 border-yellow-400">
          <div className="text-center mb-6">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-500 via-red-600 to-purple-600 bg-clip-text text-transparent mb-2">
              ⚽ DESAFÍO FUTBOLERO ⚽
            </h1>
            <p className="text-xl text-purple-700 font-semibold">
              Carrera de obstáculos en el estadio
            </p>
          </div>

          <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-red-50 border-3 border-yellow-400 rounded-xl shadow-inner">
            <h2 className="font-bold text-xl mb-3 text-red-700">
              🎮 Cómo Jugar:
            </h2>
            <ul className="text-base space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-2xl">⬆️</span>
                <kbd className="px-3 py-1 bg-white border-2 border-gray-300 rounded-lg shadow">
                  ESPACIO
                </kbd>{" "}
                o
                <kbd className="px-3 py-1 bg-white border-2 border-gray-300 rounded-lg shadow">
                  ↑
                </kbd>{" "}
                o<strong className="text-blue-600">TOQUE</strong> = Saltar
              </li>
              <li className="flex items-center gap-2">
                <span className="text-2xl">⬇️</span>
                <kbd className="px-3 py-1 bg-white border-2 border-gray-300 rounded-lg shadow">
                  ↓
                </kbd>{" "}
                = Agacharse (mantén pulsado en móvil)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-2xl">📱</span>
                <span>
                  En pantallas pequeñas usa los botones{" "}
                  <strong>“Saltar”</strong> y <strong>“Agacharse”</strong>.
                </span>
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

          <div className="space-y-3 mb-6">
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
                  className={`w-full p-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg ${
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

          {unlockedLevels.length > 0 && (
            <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-400 rounded-xl shadow-lg">
              <h3 className="font-bold text-xl mb-3 text-amber-800 flex items-center gap-2">
                🗺️ Pistas Desbloqueadas:
              </h3>
              <div className="space-y-2">
                {unlockedLevels
                  .sort((a, b) => a - b)
                  .map((level) => (
                    <div
                      key={level}
                      className="p-3 bg-white rounded-lg border-2 border-amber-200 shadow"
                    >
                      <p className="text-base font-mono">
                        {treasureClues[level]}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {unlockedLevels.length > 0 && (
            <button
              onClick={resetProgress}
              className="w-full p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 flex items-center justify-center gap-2 font-bold shadow-lg"
            >
              <RotateCcw className="w-5 h-5" />
              Reiniciar Temporada
            </button>
          )}
        </div>
      </div>
    );
  }

  if (gameState === "levelComplete") {
    return (
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

          <button
            onClick={() => setGameState("menu")}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg"
          >
            Volver al Mapa
          </button>
        </div>
      </div>
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
      <div className="md:hidden absolute inset-x-0 bottom-6 flex items-center justify-between px-6">
        <button
          type="button"
          className="px-6 py-4 bg-blue-600 text-white rounded-2xl text-lg font-bold shadow-xl"
          onPointerDown={() => controlsRef.current.jump()}
        >
          Saltar
        </button>
        <button
          type="button"
          className="px-6 py-4 bg-purple-600 text-white rounded-2xl text-lg font-bold shadow-xl"
          onPointerDown={() => controlsRef.current.duck(true)}
          onPointerUp={() => controlsRef.current.duck(false)}
          onPointerCancel={() => controlsRef.current.duck(false)}
          onPointerLeave={() => controlsRef.current.duck(false)}
        >
          Agacharse
        </button>
      </div>
    </div>
  );
};

export default ReyesMagosDashGame;
