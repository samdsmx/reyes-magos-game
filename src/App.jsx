import React, { useState, useEffect, useRef } from "react";
import { Trophy, RotateCcw } from "lucide-react";

const ReyesMagosDashGame = () => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState("menu");
  const [currentLevel, setCurrentLevel] = useState(1);
  const [unlockedLevels, setUnlockedLevels] = useState([]);
  const [score, setScore] = useState(0);
  const gameLoopRef = useRef(null);

  const treasureClues = {
    1: "⭐ PISTA 1: Los Reyes Magos dejaron su primera pista en...",
    2: "🎁 PISTA 2: Busca donde brillan las luces navideñas...",
    3: "🌟 PISTA 3: Melchor dice: cuenta 20 pasos desde el árbol...",
    4: "👑 PISTA 4: Gaspar señala: el regalo está cerca del agua...",
    5: "✨ PISTA 5: Baltasar revela: ¡Bajo la estrella dorada!",
  };

  const levels = [
    { name: "Camino a Belén", speed: 2.5, obstacleFreq: 180, difficulty: 0.5 },
    {
      name: "Valle de Estrellas",
      speed: 3,
      obstacleFreq: 170,
      difficulty: 0.6,
    },
    { name: "Desierto Dorado", speed: 3.5, obstacleFreq: 160, difficulty: 0.7 },
    { name: "Montañas Nevadas", speed: 4, obstacleFreq: 150, difficulty: 0.8 },
    { name: "Portal de Belén", speed: 4.5, obstacleFreq: 140, difficulty: 0.9 },
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
    canvas.width = 1000;
    canvas.height = 500;

    const levelConfig = levels[currentLevel - 1];

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
    let frameCount = 0;
    let distance = 0;
    const groundY = 430;
    const levelDistance = 5000;

    for (let i = 0; i < 50; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * (groundY - 50),
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.5 + 0.2,
      });
    }

    const jump = () => {
      if (!character.isJumping && !character.isDucking) {
        character.velocityY = character.jumpPower;
        character.isJumping = true;
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

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("click", handleClick);

    const drawBackground = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, groundY);
      gradient.addColorStop(0, "#0a0e27");
      gradient.addColorStop(0.5, "#1a1f4d");
      gradient.addColorStop(1, "#2d3561");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, groundY);

      stars.forEach((star) => {
        star.x -= star.speed;
        if (star.x < 0) star.x = canvas.width;

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
        canvas.height
      );
      groundGradient.addColorStop(0, "#d4a574");
      groundGradient.addColorStop(1, "#b8885a");
      ctx.fillStyle = groundGradient;
      ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

      ctx.fillStyle = "rgba(210, 180, 140, 0.3)";
      ctx.beginPath();
      ctx.ellipse(
        200 - (distance % 400),
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
        600 - (distance % 400),
        groundY + 15,
        120,
        25,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    };

    const drawCharacter = () => {
      const x = character.x;
      const y = character.isDucking ? groundY - 25 : character.y;
      const height = character.isDucking
        ? character.height * 0.6
        : character.height;
      const width = character.width;

      if (character.isDucking) {
        ctx.fillStyle = "#c41e3a";
        ctx.fillRect(x - 5, y, width + 10, height);

        ctx.fillStyle = "#ffd700";
        ctx.fillRect(x + 5, y - 8, 25, 8);
        ctx.fillRect(x + 8, y - 12, 6, 4);
        ctx.fillRect(x + 16, y - 12, 6, 4);
        ctx.fillRect(x + 24, y - 12, 6, 4);

        ctx.fillStyle = "#ffdbac";
        ctx.fillRect(x + 8, y, 20, 15);

        ctx.fillStyle = "#f5f5f5";
        ctx.fillRect(x + 8, y + 12, 20, 12);
      } else {
        ctx.fillStyle = "#c41e3a";
        ctx.shadowBlur = 5;
        ctx.shadowColor = "#8b0000";
        ctx.beginPath();
        ctx.ellipse(
          x + width / 2,
          y + 15,
          width / 2 + 5,
          height - 15,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + width / 2, y + 15, width / 2 - 2, 0, Math.PI);
        ctx.stroke();

        ctx.fillStyle = "#8b4513";
        ctx.fillRect(x + 8, y + 20, width - 16, height - 25);

        ctx.fillStyle = "#ffdbac";
        ctx.beginPath();
        ctx.arc(x + width / 2, y + 12, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffd700";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#ffd700";
        ctx.fillRect(x + 5, y - 2, width - 10, 6);
        ctx.fillRect(x + 7, y - 8, 5, 6);
        ctx.fillRect(x + 15, y - 10, 5, 8);
        ctx.fillRect(x + 23, y - 8, 5, 6);
        ctx.shadowBlur = 0;

        ctx.fillStyle = "#ff0000";
        ctx.beginPath();
        ctx.arc(x + width / 2, y - 7, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#f5f5f5";
        ctx.beginPath();
        ctx.moveTo(x + width / 2 - 8, y + 15);
        ctx.lineTo(x + width / 2 - 6, y + 25);
        ctx.lineTo(x + width / 2, y + 28);
        ctx.lineTo(x + width / 2 + 6, y + 25);
        ctx.lineTo(x + width / 2 + 8, y + 15);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#000000";
        ctx.fillRect(x + 14, y + 10, 2, 2);
        ctx.fillRect(x + 19, y + 10, 2, 2);

        ctx.strokeStyle = "#8b7355";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + width - 2, y + 20);
        ctx.lineTo(x + width - 2, y + height);
        ctx.stroke();

        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        ctx.arc(x + width - 2, y + 18, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const createObstacle = () => {
      const types = ["gift", "palm", "camel", "star", "arch"];
      const type = types[Math.floor(Math.random() * types.length)];

      let obstacle = {
        x: canvas.width,
        type: type,
        passed: false,
      };

      if (type === "gift") {
        obstacle.width = 30;
        obstacle.height = 35;
        obstacle.y = groundY - obstacle.height;
      } else if (type === "palm") {
        obstacle.width = 25;
        obstacle.height = 70;
        obstacle.y = groundY - obstacle.height;
      } else if (type === "camel") {
        obstacle.width = 50;
        obstacle.height = 55;
        obstacle.y = groundY - obstacle.height;
      } else if (type === "star") {
        obstacle.width = 50;
        obstacle.height = 50;
        obstacle.y = groundY - 140;
      } else if (type === "arch") {
        obstacle.width = 90;
        obstacle.height = 70;
        obstacle.y = groundY - 130;
      }

      return obstacle;
    };

    const drawObstacle = (obs) => {
      ctx.shadowBlur = 0;

      if (obs.type === "gift") {
        const colors = ["#c41e3a", "#2e8b57", "#ffd700", "#4169e1"];
        ctx.fillStyle = colors[Math.floor(obs.x / 200) % colors.length];
        ctx.fillRect(obs.x, obs.y + 10, obs.width, obs.height - 10);

        ctx.fillStyle = "#ffd700";
        ctx.fillRect(obs.x + obs.width / 2 - 3, obs.y + 10, 6, obs.height - 10);
        ctx.fillRect(obs.x, obs.y + obs.height / 2 + 5, obs.width, 6);

        ctx.beginPath();
        ctx.arc(obs.x + obs.width / 2 - 8, obs.y + 5, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(obs.x + obs.width / 2 + 8, obs.y + 5, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (obs.type === "palm") {
        ctx.fillStyle = "#8b6914";
        ctx.fillRect(obs.x + 8, obs.y + 20, 9, obs.height - 20);

        ctx.fillStyle = "#228b22";
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3 - Math.PI / 2;
          ctx.save();
          ctx.translate(obs.x + 12, obs.y + 25);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.ellipse(0, -15, 8, 20, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.fillStyle = "#8b4513";
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(obs.x + 12 + (i - 1) * 6, obs.y + 30, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (obs.type === "camel") {
        ctx.fillStyle = "#daa520";
        ctx.fillRect(obs.x + 10, obs.y + 25, 35, 18);

        ctx.beginPath();
        ctx.arc(obs.x + 22, obs.y + 20, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillRect(obs.x + 38, obs.y + 15, 8, 20);
        ctx.beginPath();
        ctx.arc(obs.x + 42, obs.y + 12, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#cd9b1d";
        ctx.beginPath();
        ctx.ellipse(obs.x + 39, obs.y + 8, 3, 5, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(obs.x + 45, obs.y + 8, 3, 5, 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#daa520";
        ctx.fillRect(obs.x + 15, obs.y + 43, 6, 12);
        ctx.fillRect(obs.x + 25, obs.y + 43, 6, 12);
        ctx.fillRect(obs.x + 35, obs.y + 43, 6, 12);

        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(obs.x + 44, obs.y + 11, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#c41e3a";
        ctx.fillRect(obs.x + 12, obs.y + 24, 30, 8);
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x + 12, obs.y + 24, 30, 8);
      } else if (obs.type === "star") {
        ctx.fillStyle = "#ffd700";
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#ffd700";

        const centerX = obs.x + obs.width / 2;
        const centerY = obs.y + obs.height / 2;
        const outerRadius = 25;
        const innerRadius = 12;
        const points = 5;

        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / points - Math.PI / 2;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (obs.type === "arch") {
        ctx.strokeStyle = "#daa520";
        ctx.lineWidth = 8;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(obs.x + 10, groundY);
        ctx.lineTo(obs.x + 10, obs.y + 40);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width - 10, groundY);
        ctx.lineTo(obs.x + obs.width - 10, obs.y + 40);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(
          obs.x + obs.width / 2,
          obs.y + 40,
          obs.width / 2 - 10,
          Math.PI,
          0
        );
        ctx.stroke();

        ctx.fillStyle = "#ffd700";
        for (let i = 0; i < 5; i++) {
          const angle = Math.PI + (i * Math.PI) / 4;
          const x =
            obs.x + obs.width / 2 + Math.cos(angle) * (obs.width / 2 - 10);
          const y = obs.y + 40 + Math.sin(angle) * (obs.width / 2 - 10);
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = "#ff6347";
        ctx.beginPath();
        ctx.arc(obs.x + obs.width / 2, obs.y + 20, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        ctx.arc(obs.x + obs.width / 2, obs.y + 20, 5, 0, Math.PI * 2);
        ctx.fill();
      }
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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
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
        if (!lastObstacle || lastObstacle.x < canvas.width - 200) {
          obstacles.push(createObstacle());
        }
      }

      obstacles = obstacles.filter((obs) => {
        obs.x -= levelConfig.speed;
        drawObstacle(obs);

        if (checkCollision(obs)) {
          setGameState("gameOver");
          return false;
        }

        if (!obs.passed && obs.x + obs.width < character.x) {
          obs.passed = true;
          setScore((prev) => prev + 10);
        }

        return obs.x + obs.width > -50;
      });

      distance += levelConfig.speed;

      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(10, 10, 280, 110);

      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 22px Arial";
      ctx.fillText(`⭐ ${levels[currentLevel - 1].name}`, 20, 35);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px Arial";
      ctx.fillText(
        `📏 Distancia: ${Math.floor(distance)}/${levelDistance}`,
        20,
        60
      );
      ctx.fillText(`🎁 Puntos: ${score}`, 20, 85);

      ctx.fillStyle = "#1a1f4d";
      ctx.fillRect(20, 95, 260, 20);

      const progress = (distance / levelDistance) * 260;
      const progressGradient = ctx.createLinearGradient(
        20,
        95,
        20 + progress,
        95
      );
      progressGradient.addColorStop(0, "#ffd700");
      progressGradient.addColorStop(0.5, "#ff6347");
      progressGradient.addColorStop(1, "#c41e3a");
      ctx.fillStyle = progressGradient;
      ctx.fillRect(20, 95, progress, 20);

      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 95, 260, 20);

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
      canvas.removeEventListener("click", handleClick);
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
              ⭐ LOS REYES MAGOS ⭐
            </h1>
            <p className="text-xl text-purple-700 font-semibold">
              Búsqueda del Tesoro Navideño
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
                o<strong className="text-blue-600">CLIC</strong> = Saltar
              </li>
              <li className="flex items-center gap-2">
                <span className="text-2xl">⬇️</span>
                <kbd className="px-3 py-1 bg-white border-2 border-gray-300 rounded-lg shadow">
                  ↓
                </kbd>{" "}
                = Agacharse (para estrellas y arcos)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                <span>Evita todos los obstáculos del camino</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-2xl">🗺️</span>
                <span>Completa niveles para desbloquear pistas del tesoro</span>
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
              Reiniciar Progreso
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
            ¡Nivel Completado!
          </h2>
          <p className="text-xl mb-4">Puntuación Total: {score}</p>

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
          <div className="text-6xl mb-4">🐪</div>
          <h2 className="text-4xl font-bold text-red-600 mb-2">¡Oh no!</h2>
          <p className="text-gray-600 mb-6">Te has chocado con un obstáculo.</p>
          <p className="text-2xl font-bold mb-8">Puntuación: {score}</p>

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
    <div className="w-full h-screen bg-gray-900 flex items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        className="shadow-2xl rounded-lg bg-gray-800"
        style={{ maxWidth: "100%", maxHeight: "100%" }}
      />
    </div>
  );
};

export default ReyesMagosDashGame;
