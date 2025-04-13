/*
  invader.js - Versão com sprites melhorados
*/

class Invader {
    constructor(x, y, width, height, canFire = true, projectileSpeed = 3) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.alive = true;
        
        // Sprites melhorados com maior diferença entre frames
        this.sprites = [
            // Frame 1 - "Tentáculos estendidos"
            [
                0x0000, // 0000000000000000
                0x0C18, // 0001100000011000
                0x1E3C, // 0011110000111100
                0x3F7E, // 0111111001111110
                0xFFFF, // 1111111111111111
                0xBFF7, // 1011111111110111
                0xFFFF, // 1111111111111111
                0xFFFF, // 1111111111111111
                0x9FF9, // 1001111111111001
                0x3C3C, // 0011110000111100
                0x3C3C, // 0011110000111100
                0x4242, // 0100001001000010
                0x8001, // 1000000000000001
                0x9009, // 1001000000001001
                0x4224, // 0100001000100100
                0x2004  // 0010000000000100
            ],
            // Frame 2 - "Tentáculos recolhidos"
            [
                0x0000, // 0000000000000000
                0x0C18, // 0001100000011000
                0x1E3C, // 0011110000111100
                0x3F7E, // 0111111001111110
                0xFFFF, // 1111111111111111
                0xA7E5, // 1010011111100101
                0xFFFF, // 1111111111111111
                0xFFFF, // 1111111111111111
                0x9FF9, // 1001111111111001
                0x3C3C, // 0011110000111100
                0x3C3C, // 0011110000111100
                0x1818, // 0001100000011000
                0x0C30, // 0000110000110000
                0x0660, // 0000011001100000
                0x0660, // 0000011001100000
                0x1818  // 0001100000011000
            ]
        ];
        
        // Estado atual de animação
        this.currentFrame = 0;
        
        // Cores alternadas para diferentes tipos de invasores
        // Mais fiéis às cores originais do Space Invaders
        this.colors = ["#33FF33", "#FF33FF", "#FFFF33"];
        this.colorIndex = Math.floor(y / 30) % this.colors.length;

        // Explosão usando a matriz de bits 32x32 fornecida
        this.explosionSprite = [
            0x00000000, // 00000000000000000000000000000000
            0x00000000, // 00000000000000000000000000000000
            0x00000000, // 00000000000000000000000000000000
            0x00000000, // 00000000000000000000000000000000
            0x00300030, // 00000000001100000000110000000000
            0x00700070, // 00000000011100000001110000000000
            0x38700070, // 00111000011100000001110000111000
            0x3878078E, // 00111000001111000111110000111000
            0x3801C600, // 00111000000011100110000000111000
            0x0601C600, // 00000110000011100110000011000000
            0x0701C600, // 00000111000011000110000011000000
            0x07000000, // 00000111000000000000000011000000
            0x00C00070, // 00000000110000000000011100000000
            0x00C00070, // 00000000110000000000011100000000
            0x00C00070, // 00000000110000000000011100000000
            0x7C00001F, // 01111100000000000000000001111100
            0x7C00001F, // 01111100000000000000000001111100
            0x7C00001F, // 01111100000000000000000001111100
            0x00C00070, // 00000000110000000000011100000000
            0x00C00070, // 00000000110000000000011100000000
            0x00C6C670, // 00000000110011000110011100000000
            0x0701C600, // 00000111000011100110000011000000
            0x0701C600, // 00000111000011100110000011000000
            0x0778F898, // 00000111001111000111110011000000
            0x38700070, // 00111000011100000001110000111000
            0x38700070, // 00111000011100000001110000111000
            0x38400030, // 00111000001000000000110000111000
            0x00000000, // 00000000000000000000000000000000
            0x00000000, // 00000000000000000000000000000000
            0x00000000, // 00000000000000000000000000000000
            0x00000000, // 00000000000000000000000000000000
            0x00000000  // 00000000000000000000000000000000
        ];

        // Propriedades para controlar a animação de explosão
        this.exploding = false;
        this.explosionTimer = 0;
        this.explosionDuration = 500; // ALTERADO: Duração reduzida para 500ms (meio segundo)
    }

    // Alternar o frame de animação
    toggleFrame() {
        this.currentFrame = 1 - this.currentFrame;
    }

    update(deltaTime) {
        // Se estiver explodindo, diminua o timer
        if (this.exploding) {
            // Verifica se deltaTime é um número válido
            if (typeof deltaTime === 'number' && !isNaN(deltaTime)) {
                this.explosionTimer -= deltaTime;
                
                // Adicione um log para debug
                console.log(`Explosion timer: ${this.explosionTimer}`);
                
                if (this.explosionTimer <= 0) {
                    this.exploding = false;
                    this.alive = false; // Remove o invasor quando a explosão terminar
                    console.log('Explosion finished, invader removed');
                }
            } else {
                // Se deltaTime não for válido, use um valor fixo como fallback
                this.explosionTimer -= 16; // Aproximadamente 60fps
                console.warn('Invalid deltaTime in invader update, using fallback value');
            }
        }
    }

    render(ctx) {
        if (!this.alive) return;
        
        if (this.exploding) {
            // Desenha a explosão usando a matriz de bits 32x32
            const pixelSize = this.width / 32; // Ajustado para 32x32
            
            // Cores para um efeito mais realista de explosão
            const explosionColors = [
                "#FF6600", // Laranja
                "#FF4500", // Vermelho-alaranjado
                "#FFCC00"  // Amarelo
            ];
            
            // Desenha o sprite de explosão pixel por pixel
            for (let row = 0; row < 32; row++) {
                for (let col = 0; col < 32; col++) {
                    if ((this.explosionSprite[row] >> (31 - col)) & 1) {
                        // Escolhe uma cor aleatória para cada pixel para efeito de fogo
                        ctx.fillStyle = explosionColors[Math.floor(Math.random() * explosionColors.length)];
                        ctx.fillRect(
                            this.x + (col * pixelSize),
                            this.y + (row * pixelSize),
                            pixelSize,
                            pixelSize
                        );
                    }
                }
            }
            
            // Adiciona um brilho ao redor da explosão para maior efeito visual
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = "#FFFF00";
            ctx.beginPath();
            ctx.arc(
                this.x + this.width/2, 
                this.y + this.height/2, 
                this.width * 0.7 * (1 + 0.2 * Math.sin(Date.now() * 0.01)), // Brilho pulsante
                0, 
                Math.PI * 2
            );
            ctx.fill();
            ctx.restore();
        } else {
            // Renderização normal do invasor
            const pixelSize = this.width / 16;
            ctx.fillStyle = this.colors[this.colorIndex];
            
            // Obtém o sprite atual
            const currentSprite = this.sprites[this.currentFrame];
            
            // Desenha o sprite pixel por pixel
            for (let row = 0; row < 16; row++) {
                for (let col = 0; col < 16; col++) {
                    if ((currentSprite[row] >> (15 - col)) & 1) {
                        ctx.fillRect(
                            this.x + (col * pixelSize),
                            this.y + (row * pixelSize),
                            pixelSize,
                            pixelSize
                        );
                    }
                }
            }
        }
    }

    // Método para iniciar a explosão
    startExplosion() {
        this.exploding = true;
        this.explosionTimer = this.explosionDuration;
    }
}
