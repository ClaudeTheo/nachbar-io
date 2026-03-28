// CSS-animierte Wetter-Icons
// Extrahiert aus weather-demo — alle Animationen via inline styles

interface AnimatedWeatherIconProps {
  icon: string;
  size?: number;
}

export function AnimatedWeatherIcon({
  icon,
  size = 48,
}: AnimatedWeatherIconProps) {
  const s = size;

  switch (icon) {
    case "sun":
      return (
        <div className="relative" style={{ width: s, height: s }}>
          {/* Aeusserer Glow */}
          <div
            className="absolute rounded-full"
            style={{
              inset: -8,
              background:
                "radial-gradient(circle, rgba(253,224,71,0.3) 0%, transparent 70%)",
              animation: "pulse 3s ease-in-out infinite",
            }}
          />
          {/* Strahlen */}
          <div
            className="absolute inset-0"
            style={{ animation: "spin 30s linear infinite" }}
          >
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  top: "50%",
                  left: "50%",
                  width: 2,
                  height: s * 0.28,
                  background:
                    "linear-gradient(180deg, rgba(253,224,71,0.8) 0%, transparent 100%)",
                  transformOrigin: "center bottom",
                  transform: `translate(-50%, -100%) rotate(${i * 30}deg) translateY(-${s * 0.12}px)`,
                }}
              />
            ))}
          </div>
          {/* Sonnenkern */}
          <div
            className="absolute rounded-full"
            style={{
              inset: s * 0.2,
              background:
                "radial-gradient(circle at 35% 35%, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
              boxShadow:
                "0 0 24px rgba(251,191,36,0.6), inset 0 -3px 6px rgba(245,158,11,0.3)",
            }}
          />
        </div>
      );

    case "cloud":
      return (
        <div className="relative" style={{ width: s, height: s }}>
          <div style={{ animation: "float 5s ease-in-out infinite" }}>
            <div
              className="absolute rounded-full"
              style={{
                bottom: s * 0.2,
                left: s * 0.05,
                width: s * 0.85,
                height: s * 0.35,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(220,220,230,0.8) 100%)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                bottom: s * 0.38,
                left: s * 0.12,
                width: s * 0.45,
                height: s * 0.45,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(230,230,240,0.85) 100%)",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                bottom: s * 0.33,
                left: s * 0.4,
                width: s * 0.38,
                height: s * 0.38,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(220,225,235,0.75) 100%)",
              }}
            />
          </div>
        </div>
      );

    case "cloud-sun":
      return (
        <div className="relative" style={{ width: s, height: s }}>
          {/* Sonne dahinter */}
          <div
            className="absolute rounded-full"
            style={{
              top: s * 0.02,
              right: s * 0.02,
              width: s * 0.45,
              height: s * 0.45,
              background:
                "radial-gradient(circle at 40% 40%, #FEF08A, #FBBF24, #F59E0B)",
              boxShadow: "0 0 16px rgba(251,191,36,0.5)",
            }}
          />
          {/* Wolke davor */}
          <div style={{ animation: "float 5s ease-in-out infinite" }}>
            <div
              className="absolute rounded-full"
              style={{
                bottom: s * 0.12,
                left: 0,
                width: s * 0.75,
                height: s * 0.3,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(220,225,235,0.8))",
                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                bottom: s * 0.3,
                left: s * 0.08,
                width: s * 0.38,
                height: s * 0.38,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(230,230,240,0.85))",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                bottom: s * 0.26,
                left: s * 0.3,
                width: s * 0.3,
                height: s * 0.3,
                background: "rgba(255,255,255,0.8)",
              }}
            />
          </div>
        </div>
      );

    case "rain":
      return (
        <div className="relative" style={{ width: s, height: s }}>
          {/* Dunkle Wolke */}
          <div style={{ animation: "float 4s ease-in-out infinite" }}>
            <div
              className="absolute rounded-full"
              style={{
                top: s * 0.08,
                left: s * 0.05,
                width: s * 0.85,
                height: s * 0.32,
                background:
                  "linear-gradient(180deg, rgba(180,190,200,0.85), rgba(140,155,170,0.75))",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                top: 0,
                left: s * 0.15,
                width: s * 0.42,
                height: s * 0.38,
                background:
                  "linear-gradient(180deg, rgba(190,200,210,0.9), rgba(160,175,190,0.8))",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                top: s * 0.03,
                left: s * 0.4,
                width: s * 0.35,
                height: s * 0.32,
                background: "rgba(175,188,200,0.8)",
              }}
            />
          </div>
          {/* Regentropfen */}
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: s * 0.15 + i * (s * 0.15),
                top: s * 0.5,
                width: 2.5,
                height: s * 0.18,
                background:
                  "linear-gradient(180deg, rgba(147,197,253,0.9), rgba(96,165,250,0.4))",
                borderRadius: "50% 50% 50% 50% / 20% 20% 80% 80%",
                animation: `rainDrop 0.8s ease-in infinite ${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      );

    case "snow":
      return (
        <div className="relative" style={{ width: s, height: s }}>
          {/* Wolke */}
          <div style={{ animation: "float 5s ease-in-out infinite" }}>
            <div
              className="absolute rounded-full"
              style={{
                top: s * 0.05,
                left: s * 0.05,
                width: s * 0.85,
                height: s * 0.32,
                background:
                  "linear-gradient(180deg, rgba(200,210,220,0.85), rgba(175,185,200,0.75))",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                top: 0,
                left: s * 0.18,
                width: s * 0.4,
                height: s * 0.35,
                background: "rgba(210,218,230,0.9)",
              }}
            />
          </div>
          {/* Schneeflocken */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: s * 0.1 + i * (s * 0.14),
                top: s * 0.5,
                width: s * 0.06,
                height: s * 0.06,
                background:
                  "radial-gradient(circle, rgba(255,255,255,1) 40%, rgba(255,255,255,0.4) 100%)",
                boxShadow: "0 0 4px rgba(255,255,255,0.8)",
                animation: `snowFall 2.5s ease-in-out infinite ${i * 0.35}s`,
              }}
            />
          ))}
        </div>
      );

    case "moon":
      return (
        <div className="relative" style={{ width: s, height: s }}>
          {/* Mond-Glow */}
          <div
            className="absolute rounded-full"
            style={{
              inset: -6,
              background:
                "radial-gradient(circle, rgba(253,224,71,0.15) 0%, transparent 70%)",
            }}
          />
          {/* Mond */}
          <div
            className="absolute rounded-full"
            style={{
              inset: s * 0.15,
              background:
                "radial-gradient(circle at 35% 35%, #FEF9C3 0%, #FDE68A 50%, #FCD34D 100%)",
              boxShadow: "0 0 20px rgba(253,224,71,0.3)",
            }}
          />
          {/* Mond-Schatten (Sichel-Effekt) */}
          <div
            className="absolute rounded-full"
            style={{
              top: s * 0.12,
              right: s * 0.08,
              width: s * 0.5,
              height: s * 0.5,
              background: "inherit",
              opacity: 0,
            }}
          />
          {/* Krater */}
          <div
            className="absolute rounded-full"
            style={{
              top: s * 0.3,
              left: s * 0.32,
              width: s * 0.1,
              height: s * 0.1,
              background: "rgba(200,180,100,0.25)",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              top: s * 0.48,
              left: s * 0.45,
              width: s * 0.07,
              height: s * 0.07,
              background: "rgba(200,180,100,0.2)",
            }}
          />
          {/* Sterne */}
          {[
            { x: -4, y: 4, s: 2.5 },
            { x: s - 8, y: 0, s: 2 },
            { x: -8, y: s * 0.6, s: 1.5 },
            { x: s - 4, y: s * 0.7, s: 2 },
            { x: s * 0.3, y: -6, s: 1.8 },
          ].map((star, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: star.x,
                top: star.y,
                width: star.s,
                height: star.s,
                background: "#fff",
                boxShadow: `0 0 ${star.s * 2}px rgba(255,255,255,0.8)`,
                animation: `twinkle 2.5s ease-in-out infinite ${i * 0.6}s`,
              }}
            />
          ))}
        </div>
      );

    case "sunset":
      return (
        <div className="relative" style={{ width: s, height: s }}>
          {/* Glow am Horizont */}
          <div
            className="absolute"
            style={{
              bottom: 0,
              left: -s * 0.1,
              right: -s * 0.1,
              height: s * 0.5,
              background:
                "radial-gradient(ellipse at 50% 100%, rgba(251,146,60,0.4) 0%, transparent 70%)",
            }}
          />
          {/* Sonne (halb) */}
          <div
            className="absolute overflow-hidden"
            style={{
              bottom: s * 0.15,
              left: "50%",
              transform: "translateX(-50%)",
              width: s * 0.55,
              height: s * 0.28,
              borderRadius: `${s * 0.28}px ${s * 0.28}px 0 0`,
            }}
          >
            <div
              className="absolute rounded-full"
              style={{
                bottom: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: s * 0.55,
                height: s * 0.55,
                background:
                  "radial-gradient(circle at 50% 50%, #FEF08A 0%, #FB923C 50%, #EF4444 100%)",
                boxShadow: "0 0 30px rgba(251,146,60,0.6)",
              }}
            />
          </div>
          {/* Horizont-Streifen */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute"
              style={{
                bottom: s * 0.12 - i * 5,
                left: s * 0.1,
                right: s * 0.1,
                height: 1,
                background: `rgba(255,255,255,${0.3 - i * 0.08})`,
              }}
            />
          ))}
        </div>
      );

    case "storm":
      return (
        <div className="relative" style={{ width: s, height: s }}>
          {/* Dunkle Sturm-Wolke */}
          <div style={{ animation: "float 3s ease-in-out infinite" }}>
            <div
              className="absolute rounded-full"
              style={{
                top: s * 0.05,
                left: s * 0.02,
                width: s * 0.9,
                height: s * 0.35,
                background:
                  "linear-gradient(180deg, rgba(120,130,140,0.8), rgba(80,90,100,0.7))",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                top: 0,
                left: s * 0.1,
                width: s * 0.5,
                height: s * 0.4,
                background: "rgba(130,140,150,0.85)",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                top: s * 0.02,
                left: s * 0.38,
                width: s * 0.4,
                height: s * 0.35,
                background: "rgba(110,120,135,0.8)",
              }}
            />
          </div>
          {/* Blitz */}
          <svg
            className="absolute"
            style={{
              bottom: s * 0.05,
              left: "50%",
              transform: "translateX(-50%)",
              width: s * 0.35,
              height: s * 0.5,
              animation: "flash 4s ease-in-out infinite",
              filter: "drop-shadow(0 0 6px rgba(251,191,36,0.8))",
            }}
            viewBox="0 0 24 36"
          >
            <polygon
              points="14,0 6,15 11,15 4,36 22,12 15,12 20,0"
              fill="#FBBF24"
            />
          </svg>
          {/* Regen */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: s * 0.18 + i * (s * 0.22),
                top: s * 0.48,
                width: 2,
                height: s * 0.14,
                background:
                  "linear-gradient(180deg, rgba(147,197,253,0.7), rgba(96,165,250,0.3))",
                borderRadius: 4,
                animation: `rainDrop 0.7s ease-in infinite ${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      );

    default:
      return (
        <div
          style={{
            width: s,
            height: s,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
          }}
        />
      );
  }
}
