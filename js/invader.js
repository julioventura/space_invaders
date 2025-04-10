/*
  invader.js - Versão com sprites melhorados
*/

class Invader {
    constructor(x, y) {
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
    }

    // Alternar o frame de animação
    toggleFrame() {
        this.currentFrame = 1 - this.currentFrame;
    }

    render(ctx) {
        if (!this.alive) return;
        
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
