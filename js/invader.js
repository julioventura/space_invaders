/*
  invader.js
  - Define a classe Invader que representa cada inimigo.
  - Contém propriedades como posição, tamanho e estado (vivo ou destruído).
  - Possui métodos para atualizar sua posição (gerenciados pela formação) e para renderizar o invasor.
*/

class Invader {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;    // Largura do invasor (exemplo)
        this.height = 20;   // Altura do invasor (exemplo)
        this.alive = true;
    }

    // Método para atualizar a posição, se necessário (a movimentação da formação pode ser gerenciada globalmente)
    update() {
        // A lógica de movimentação individual se integra à formação de invasores
    }

    render(ctx) {
        if (this.alive) {
            ctx.fillStyle = "#fff";  // Pode ser substituído por sprites
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

// Opcional: tornar a classe global se necessário
// window.Invader = Invader;
