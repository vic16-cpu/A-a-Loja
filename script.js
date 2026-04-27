// ==================== FIREBASE CONFIG ====================
const firebaseConfig = {
    apiKey: "AIzaSyDSeXtsug9G9MtpHy-eGSX_ZWfCBzpq_6c",
    authDomain: "acairei-5e9c8.firebaseapp.com",
    projectId: "acairei-5e9c8",
    databaseURL: "https://acairei-5e9c8-default-rtdb.firebaseio.com",
    storageBucket: "acairei-5e9c8.firebasestorage.app",
    messagingSenderId: "772500377171",
    appId: "1:772500377171:web:9ea0dd48dcf8b0f88bc0a6"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ==================== CRIPTOGRAFIA ====================
const ENCRYPTION_KEY = "AcaiRei@2024Security";

const criptografarDados = (dados) => {
    return CryptoJS.AES.encrypt(JSON.stringify(dados), ENCRYPTION_KEY).toString();
};

const descriptografarDados = (dados) => {
    try {
        const bytes = CryptoJS.AES.decrypt(dados, ENCRYPTION_KEY);
        return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (e) {
        return null;
    }
};

// ==================== VARIÁVEIS GLOBAIS ====================
let usuarioLogado = false;
let carrinhoAtual = [];
let produtoSelecionado = null;
let tamanhoSelecionado = null;
let complementosSelecionados = [];
let databaseRef = {
    cardapio: database.ref('cardapio'),
    pedidos: database.ref('pedidos'),
    entregas: database.ref('entregas'),
    vendas: database.ref('vendas'),
    admin: database.ref('admin')
};

// ==================== ELEMENTOS DOM ====================
const loginScreen = document.getElementById('loginScreen');
const publicArea = document.getElementById('publicArea');
const adminArea = document.getElementById('adminArea');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');

// ==================== AUTENTICAÇÃO ====================
// Inicializar credenciais no banco de dados (rodar uma vez)
const inicializarCredenciais = () => {
    database.ref('admin/credenciais').get().then(snapshot => {
        if (!snapshot.exists()) {
            const usuario = "Açai Rei";
            const senhas = ["17091224", "AçaiReiDeGuriri"];

            const usuarioCriptografado = criptografarDados(usuario);
            const senhasCriptografadas = senhas.map(s => criptografarDados(s));

            database.ref('admin/credenciais').set({
                usuario: usuarioCriptografado,
                senhas: senhasCriptografadas,
                criadoEm: new Date().toISOString()
            });

            console.log("✅ Credenciais inicializadas");
        }
    }).catch(error => {
        console.error("Erro ao inicializar:", error);
    });
};

// Autenticar
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const usuario = document.getElementById('usuario').value;
    const senha = document.getElementById('senha').value;

    database.ref('admin/credenciais').get().then(snapshot => {
        if (!snapshot.exists()) {
            mostrarErro("Credenciais não encontradas");
            return;
        }

        const dados = snapshot.val();
        const usuarioDescriptografado = descriptografarDados(dados.usuario);
        const senhasDescriptografadas = dados.senhas.map(s => descriptografarDados(s));

        if (usuario !== usuarioDescriptografado) {
            mostrarErro("Usuário incorreto");
            return;
        }

        if (!senhasDescriptografadas.includes(senha)) {
            mostrarErro("Senha incorreta");
            return;
        }

        // Login bem-sucedido
        const token = CryptoJS.SHA256(usuario + senha + new Date().getTime()).toString();
        localStorage.setItem("adminToken", token);
        localStorage.setItem("adminUser", usuario);

        usuarioLogado = true;
        fazerLogin();

    }).catch(error => {
        mostrarErro("Erro ao autenticar: " + error.message);
    });
});

function mostrarErro(mensagem) {
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = mensagem;
    errorEl.classList.add('show');
    setTimeout(() => {
        errorEl.classList.remove('show');
    }, 3000);
}

function fazerLogin() {
    loginScreen.classList.remove('show');
    adminArea.classList.add('show');
    carregarDadosAdmin();
}

function fazerLogout() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    usuarioLogado = false;
    adminArea.classList.remove('show');
    publicArea.classList.remove('show');
    loginScreen.classList.add('show');
    loginForm.reset();
}

logoutBtn.addEventListener('click', fazerLogout);

// ==================== NAVEGAÇÃO ADMIN ====================
document.querySelectorAll('.nav-btn:not(.logout-btn)').forEach(btn => {
    btn.addEventListener('click', () => {
        const section = btn.dataset.section;
        
        // Remover classe active de todos os botões
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Esconder todas as seções
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('show'));
        
        // Mostrar a seção selecionada
        const sectionEl = document.getElementById(section + 'Section') || 
                         document.getElementById(section);
        if (sectionEl) {
            sectionEl.classList.add('show');
        }

        // Carregar dados específicos
        if (section === 'cardapio') {
            carregarCardapio();
        } else if (section === 'entregas') {
            carregarEntregas();
        } else if (section === 'pedidos') {
            carregarPedidos();
        } else if (section === 'vendas') {
            carregarVendas();
        }
    });
});

// ==================== CARDÁPIO PÚBLICO ====================
function carregarCardapioPublico() {
    const menuLista = document.getElementById('menuLista');
    menuLista.innerHTML = '';

    databaseRef.cardapio.on('value', snapshot => {
        menuLista.innerHTML = '';
        
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const produto = child.val();
                const produtoHTML = `
                    <div class="produto-card" onclick="abrirProduto('${child.key}', ${JSON.stringify(produto).replace(/'/g, '&apos;')})">
                        <div class="produto-imagem">🥤</div>
                        <div class="produto-info">
                            <h3>${produto.nome}</h3>
                            <p>${produto.descricao || ''}</p>
                            <div class="produto-preco">R$ ${parseFloat(produto.preco).toFixed(2)}</div>
                        </div>
                    </div>
                `;
                menuLista.insertAdjacentHTML('beforeend', produtoHTML);
            });
        } else {
            menuLista.innerHTML = '<p>Nenhum produto disponível</p>';
        }
    });
}

function abrirProduto(key, produto) {
    produtoSelecionado = { key, ...produto };
    tamanhoSelecionado = null;
    complementosSelecionados = [];

    document.getElementById('produtoNome').textContent = produto.nome;
    document.getElementById('produtoDescricao').textContent = produto.descricao || '';
    document.getElementById('produtoPreco').textContent = `R$ ${parseFloat(produto.preco).toFixed(2)}`;

    // Tamanhos
    const tamanhosDiv = document.getElementById('tamanhos');
    tamanhosDiv.innerHTML = '';
    if (produto.tamanhos && Array.isArray(produto.tamanhos)) {
        produto.tamanhos.forEach((tam, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tamanho-btn';
            btn.textContent = `${tam.nome}\nR$ ${parseFloat(tam.preco || 0).toFixed(2)}`;
            btn.onclick = () => selecionarTamanho(tam, index, btn);
            tamanhosDiv.appendChild(btn);
        });
    }

    // Complementos
    const complementosDiv = document.getElementById('complementos');
    complementosDiv.innerHTML = '';
    if (produto.complementos && Array.isArray(produto.complementos)) {
        produto.complementos.forEach((comp, index) => {
            const div = document.createElement('div');
            div.className = 'complemento-item';
            div.innerHTML = `
                <input type="checkbox" id="comp_${index}" data-index="${index}" onchange="selecionarComplemento(${index}, '${comp.nome}', ${comp.preco || 0})">
                <label for="comp_${index}">${comp.nome}</label>
                <span class="complemento-preco">R$ ${parseFloat(comp.preco || 0).toFixed(2)}</span>
            `;
            complementosDiv.appendChild(div);
        });
    }

    abrirModal('produtoModal');
}

function selecionarTamanho(tamanho, index, elemento) {
    tamanhoSelecionado = tamanho;
    
    document.querySelectorAll('.tamanho-btn').forEach(btn => btn.classList.remove('selected'));
    elemento.classList.add('selected');
}

function selecionarComplemento(index, nome, preco) {
    const checkbox = document.getElementById(`comp_${index}`);
    
    if (checkbox.checked) {
        if (!complementosSelecionados.find(c => c.nome === nome)) {
            complementosSelecionados.push({ nome, preco });
        }
    } else {
        complementosSelecionados = complementosSelecionados.filter(c => c.nome !== nome);
    }
}

document.getElementById('adicionarAoCarrinhoBtn').addEventListener('click', () => {
    if (!tamanhoSelecionado) {
        alert('Selecione um tamanho');
        return;
    }

    const preco = parseFloat(produtoSelecionado.preco) + parseFloat(tamanhoSelecionado.preco || 0) + 
                  complementosSelecionados.reduce((sum, c) => sum + parseFloat(c.preco || 0), 0);

    const item = {
        id: Math.random(),
        produto: produtoSelecionado.nome,
        tamanho: tamanhoSelecionado.nome,
        complementos: complementosSelecionados,
        preco: preco
    };

    carrinhoAtual.push(item);
    atualizarCarrinho();
    fecharModal('produtoModal');
    alert('Adicionado ao carrinho!');
});

// ==================== CARRINHO ====================
function atualizarCarrinho() {
    document.getElementById('carrinhoCount').textContent = carrinhoAtual.length;
    renderizarCarrinho();
}

function renderizarCarrinho() {
    const carrinhoItens = document.getElementById('carrinhoItens');
    carrinhoItens.innerHTML = '';

    let subtotal = 0;
    carrinhoAtual.forEach((item, index) => {
        subtotal += item.preco;
        const itemHTML = `
            <div class="carrinho-item">
                <div class="carrinho-item-info">
                    <div class="carrinho-item-nome">${item.produto}</div>
                    <div class="carrinho-item-detalhes">${item.tamanho}</div>
                    ${item.complementos.length > 0 ? `<div class="carrinho-item-detalhes">${item.complementos.map(c => c.nome).join(', ')}</div>` : ''}
                </div>
                <div class="carrinho-item-preco">R$ ${item.preco.toFixed(2)}</div>
                <button class="carrinho-item-remover" onclick="removerDoCarrinho(${index})">Remover</button>
            </div>
        `;
        carrinhoItens.insertAdjacentHTML('beforeend', itemHTML);
    });

    document.getElementById('subtotal').textContent = subtotal.toFixed(2);
    
    // Atualizar taxa de entrega baseado no bairro selecionado
    atualizarTaxaEntrega();
}

function removerDoCarrinho(index) {
    carrinhoAtual.splice(index, 1);
    atualizarCarrinho();
}

function atualizarTaxaEntrega() {
    const bairroSelect = document.getElementById('bairro');
    const bairroValue = bairroSelect.value;
    let taxa = 0;

    if (bairroValue) {
        databaseRef.entregas.child(bairroValue).get().then(snapshot => {
            if (snapshot.exists()) {
                taxa = parseFloat(snapshot.val().taxa) || 0;
            }
            atualizarTotal(taxa);
        });
    } else {
        atualizarTotal(0);
    }
}

function atualizarTotal(taxa) {
    const subtotal = carrinhoAtual.reduce((sum, item) => sum + item.preco, 0);
    const total = subtotal + taxa;

    document.getElementById('taxaEntrega').textContent = taxa.toFixed(2);
    document.getElementById('totalFinal').textContent = total.toFixed(2);
}

// ==================== CARRINHO MODAL ====================
const carrinhoModal = document.getElementById('carrinhoModal');
const carrinhoBtn = document.getElementById('carrinhoBtnPublic');

carrinhoBtn.addEventListener('click', () => {
    renderizarCarrinho();
    abrirModal('carrinhoModal');
});

document.getElementById('checkoutBtn').addEventListener('click', () => {
    if (carrinhoAtual.length === 0) {
        alert('Seu carrinho está vazio');
        return;
    }
    fecharModal('carrinhoModal');
    carregarBairros();
    abrirModal('checkoutModal');
});

// ==================== CARREGAR BAIRROS ====================
function carregarBairros() {
    const bairroSelect = document.getElementById('bairro');
    bairroSelect.innerHTML = '<option value="">Selecione um bairro</option>';

    databaseRef.entregas.on('value', snapshot => {
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const option = document.createElement('option');
                option.value = child.key;
                option.textContent = child.key;
                bairroSelect.appendChild(option);
            });
        }
    });
}

// Atualizar taxa quando bairro muda
document.getElementById('bairro').addEventListener('change', atualizarTaxaEntrega);

// ==================== CHECKOUT ====================
const checkoutForm = document.getElementById('checkoutForm');
const tipoEntregaRadios = document.querySelectorAll('input[name="tipoEntrega"]');
const enderecoSection = document.getElementById('enderecoSection');

tipoEntregaRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        if (radio.value === 'retirada') {
            enderecoSection.style.display = 'none';
        } else {
            enderecoSection.style.display = 'block';
        }
    });
});

checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const tipoEntrega = document.querySelector('input[name="tipoEntrega"]:checked').value;
    const nome = document.getElementById('nomeCliente').value;
    const telefone = document.getElementById('telefoneCliente').value;
    const bairro = document.getElementById('bairro').value;

    let endereco = null;
    if (tipoEntrega === 'entrega') {
        if (!bairro) {
            alert('Selecione um bairro');
            return;
        }
        endereco = {
            endereco: document.getElementById('endereco').value,
            numero: document.getElementById('numero').value,
            complemento: document.getElementById('complementoEndereco').value,
            bairro: bairro,
            pontoRef: document.getElementById('pontoRef').value
        };
    }

    const formaCartao = document.querySelector('input[name="formaPagamento"]:checked');
    if (!formaCartao) {
        alert('Selecione uma forma de pagamento');
        return;
    }

    const subtotal = carrinhoAtual.reduce((sum, item) => sum + item.preco, 0);
    let taxaEntrega = 0;

    if (tipoEntrega === 'entrega' && bairro) {
        database.ref(`entregas/${bairro}`).get().then(snapshot => {
            if (snapshot.exists()) {
                taxaEntrega = parseFloat(snapshot.val().taxa) || 0;
            }
            finalizarPedido(tipoEntrega, nome, telefone, endereco, formaCartao.value, subtotal, taxaEntrega);
        });
    } else {
        finalizarPedido(tipoEntrega, nome, telefone, endereco, formaCartao.value, subtotal, 0);
    }
});

function finalizarPedido(tipoEntrega, nome, telefone, endereco, formaPagamento, subtotal, taxaEntrega) {
    const total = subtotal + taxaEntrega;
    const horaPedido = new Date();

    const pedido = {
        numero: Math.floor(Math.random() * 10000),
        tipo: tipoEntrega,
        cliente: {
            nome: nome,
            telefone: telefone,
            endereco: endereco
        },
        itens: carrinhoAtual,
        subtotal: subtotal,
        taxaEntrega: taxaEntrega,
        total: total,
        formaPagamento: formaPagamento,
        status: 'pendente',
        dataPedido: horaPedido.toLocaleString(),
        timestamp: horaPedido.getTime()
    };

    // Salvar no Firebase
    database.ref(`pedidos/${pedido.numero}`).set(pedido).then(() => {
        // Salvar na aba de vendas
        database.ref(`vendas/${pedido.numero}`).set(pedido);

        // Limpar carrinho
        carrinhoAtual = [];
        atualizarCarrinho();

        // Fechar modal e mostrar mensagem
        fecharModal('checkoutModal');
        alert(`Pedido #${pedido.numero} realizado com sucesso!\nTempo estimado: 30-45 minutos`);

        // Resetar formulário
        checkoutForm.reset();
        enderecoSection.style.display = 'block';

        // Voltar para o menu
        publicArea.classList.remove('show');
        loginScreen.classList.add('show');
    }).catch(error => {
        alert('Erro ao finalizar pedido: ' + error.message);
    });
}

// ==================== FORMAS DE PAGAMENTO ====================
function carregarFormasPagamento() {
    const container = document.getElementById('formasPagamento');
    container.innerHTML = '';

    database.ref('admin/pagamentos').get().then(snapshot => {
        const pagamentos = snapshot.exists() ? snapshot.val() : {};

        const formas = [
            { id: 'pagar_entrega', nome: '💰 Pagar na Entrega', ativo: pagamentos.pagar_entrega !== false },
            { id: 'debito', nome: '💳 Cartão de Débito', ativo: pagamentos.debito || false },
            { id: 'credito', nome: '💳 Cartão de Crédito', ativo: pagamentos.credito || false },
            { id: 'vale', nome: '🏷️ Vale Alimentação', ativo: pagamentos.vale || false },
            { id: 'pix', nome: '📱 PIX', ativo: pagamentos.pix !== false }
        ];

        formas.forEach(forma => {
            if (forma.ativo) {
                const div = document.createElement('div');
                div.className = 'complemento-item';
                div.innerHTML = `
                    <input type="radio" name="formaPagamento" value="${forma.id}" id="forma_${forma.id}">
                    <label for="forma_${forma.id}">${forma.nome}</label>
                `;
                container.appendChild(div);
            }
        });

        // Selecionar primeira forma por padrão
        const primeiro = container.querySelector('input[type="radio"]');
        if (primeiro) primeiro.checked = true;
    });
}

// ==================== MODAL FUNCTIONS ====================
function abrirModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function fecharModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// Fechar modal ao clicar no X
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', (e) => {
        e.target.closest('.modal').classList.remove('show');
    });
});

// Fechar modal ao clicar fora
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });
});

// ==================== SEÇÃO PEDIDOS ADMIN ====================
function carregarPedidos() {
    const pedidosLista = document.getElementById('pedidosLista');
    const filtros = document.querySelectorAll('.filtro-btn');

    let filtroAtual = 'pendente';

    filtros.forEach(filtro => {
        filtro.addEventListener('click', () => {
            filtros.forEach(f => f.classList.remove('active'));
            filtro.classList.add('active');
            filtroAtual = filtro.dataset.filtro;
            renderizarPedidos(pedidosLista, filtroAtual);
        });
    });

    renderizarPedidos(pedidosLista, filtroAtual);
}

function renderizarPedidos(container, filtro) {
    container.innerHTML = '';

    databaseRef.pedidos.on('value', snapshot => {
        container.innerHTML = '';

        if (!snapshot.exists()) {
            container.innerHTML = '<p>Nenhum pedido encontrado</p>';
            return;
        }

        snapshot.forEach(child => {
            const pedido = child.val();

            if (pedido.status === filtro) {
                const itensHTML = pedido.itens.map(item => 
                    `${item.produto} (${item.tamanho}) - R$ ${item.preco.toFixed(2)}`
                ).join('<br>');

                const pedidoHTML = `
                    <div class="pedido-card">
                        <div class="pedido-header">
                            <span class="pedido-numero">Pedido #${pedido.numero}</span>
                            <span class="pedido-status status-${pedido.status}">${pedido.status.toUpperCase()}</span>
                        </div>

                        <div class="pedido-info">
                            <strong>Cliente:</strong> <span class="label">${pedido.cliente.nome}</span>
                        </div>

                        <div class="pedido-info">
                            <strong>Telefone:</strong> <span class="label">${pedido.cliente.telefone}</span>
                        </div>

                        <div class="pedido-info">
                            <strong>Tipo:</strong> <span class="label">${pedido.tipo === 'entrega' ? '🚚 Entrega' : '🏪 Retirada'}</span>
                        </div>

                        ${pedido.cliente.endereco ? `
                            <div class="pedido-info">
                                <strong>Endereço:</strong><br>
                                <span class="label">${pedido.cliente.endereco.endereco}, ${pedido.cliente.endereco.numero} ${pedido.cliente.endereco.complemento ? '- ' + pedido.cliente.endereco.complemento : ''}</span><br>
                                <span class="label">${pedido.cliente.endereco.bairro}</span><br>
                                ${pedido.cliente.endereco.pontoRef ? `<span class="label">Ref: ${pedido.cliente.endereco.pontoRef}</span>` : ''}
                            </div>
                        ` : ''}

                        <div class="pedido-info">
                            <strong>Data/Hora:</strong> <span class="label">${pedido.dataPedido}</span>
                        </div>

                        <div class="pedido-itens">
                            <strong>Itens:</strong><br>
                            ${itensHTML}
                        </div>

                        <div class="pedido-info">
                            <strong>Forma de Pagamento:</strong> <span class="label">${pedido.formaPagamento}</span>
                        </div>

                        <div class="pedido-total">
                            Subtotal: R$ ${pedido.subtotal.toFixed(2)}<br>
                            Taxa: R$ ${pedido.taxaEntrega.toFixed(2)}<br>
                            <strong>TOTAL: R$ ${pedido.total.toFixed(2)}</strong>
                        </div>

                        <div class="pedido-acoes">
                            ${pedido.status === 'pendente' ? `<button class="btn-aceitar" onclick="atualizarStatusPedido(${pedido.numero}, 'despachado')">Aceitar</button>` : ''}
                            ${pedido.status === 'despachado' ? `<button class="btn-despachar" onclick="atualizarStatusPedido(${pedido.numero}, 'concluido')">Despachado</button>` : ''}
                            ${pedido.status !== 'concluido' ? `<button class="btn-concluir" onclick="atualizarStatusPedido(${pedido.numero}, 'concluido')">Concluir</button>` : ''}
                        </div>
                    </div>
                `;

                container.insertAdjacentHTML('beforeend', pedidoHTML);
            }
        });
    });
}

function atualizarStatusPedido(numero, novoStatus) {
    database.ref(`pedidos/${numero}/status`).set(novoStatus).then(() => {
        console.log(`Pedido ${numero} atualizado para ${novoStatus}`);
    });
}

// ==================== SEÇÃO CARDÁPIO ADMIN ====================
const btnAdicionarProduto = document.getElementById('btnAdicionarProduto');
const produtoFormModal = document.getElementById('produtoFormModal');
const produtoForm = document.getElementById('produtoForm');

btnAdicionarProduto.addEventListener('click', () => {
    document.getElementById('produtoFormTitulo').textContent = 'Adicionar Produto';
    produtoForm.reset();
    document.getElementById('tamanhosList').innerHTML = '';
    document.getElementById('complementosList').innerHTML = '';
    abrirModal('produtoFormModal');
});

document.getElementById('btnAdicionarTamanho').addEventListener('click', () => {
    const tamanhosList = document.getElementById('tamanhosList');
    const index = tamanhosList.children.length;
    const div = document.createElement('div');
    div.className = 'tamanho-item';
    div.innerHTML = `
        <input type="text" placeholder="Ex: 500ml" required>
        <input type="number" step="0.01" placeholder="Preço adicional" required>
        <button type="button" class="btn-remover" onclick="this.parentElement.remove()">Remover</button>
    `;
    tamanhosList.appendChild(div);
});

document.getElementById('btnAdicionarComplemento').addEventListener('click', () => {
    const complementosList = document.getElementById('complementosList');
    const index = complementosList.children.length;
    const div = document.createElement('div');
    div.className = 'complemento-item-admin';
    div.innerHTML = `
        <input type="text" placeholder="Ex: Leite em pó" required>
        <input type="number" step="0.01" placeholder="Preço" required>
        <button type="button" class="btn-remover" onclick="this.parentElement.remove()">Remover</button>
    `;
    complementosList.appendChild(div);
});

produtoForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const nome = document.getElementById('formProdutoNome').value;
    const descricao = document.getElementById('formProdutoDescricao').value;
    const preco = document.getElementById('formProdutoPreco').value;

    const tamanhos = Array.from(document.getElementById('tamanhosList').children).map(item => ({
        nome: item.querySelector('input:nth-child(1)').value,
        preco: parseFloat(item.querySelector('input:nth-child(2)').value)
    }));

    const complementos = Array.from(document.getElementById('complementosList').children).map(item => ({
        nome: item.querySelector('input:nth-child(1)').value,
        preco: parseFloat(item.querySelector('input:nth-child(2)').value)
    }));

    const produto = {
        nome,
        descricao,
        preco: parseFloat(preco),
        tamanhos,
        complementos,
        dataCriacao: new Date().toLocaleString()
    };

    database.ref(`cardapio/${Date.now()}`).set(produto).then(() => {
        alert('Produto adicionado com sucesso!');
        fecharModal('produtoFormModal');
        produtoForm.reset();
        carregarCardapio();
    }).catch(error => {
        alert('Erro: ' + error.message);
    });
});

function carregarCardapio() {
    const cardapioLista = document.getElementById('cardapioLista');
    cardapioLista.innerHTML = '';

    databaseRef.cardapio.on('value', snapshot => {
        cardapioLista.innerHTML = '';

        if (!snapshot.exists()) {
            cardapioLista.innerHTML = '<p>Nenhum produto no cardápio</p>';
            return;
        }

        snapshot.forEach(child => {
            const produto = child.val();
            const tamanhoInfo = produto.tamanhos && produto.tamanhos.length > 0 
                ? `${produto.tamanhos.length} tamanho(s)` 
                : 'Sem tamanhos';
            const complementoInfo = produto.complementos && produto.complementos.length > 0 
                ? `${produto.complementos.length} complemento(s)` 
                : 'Sem complementos';

            const produtoHTML = `
                <div class="cardapio-item">
                    <div class="cardapio-item-header">
                        <div>
                            <h3>${produto.nome}</h3>
                            <p>${produto.descricao || ''}</p>
                        </div>
                        <div class="cardapio-item-acoes">
                            <button class="btn-editar" onclick="editarProduto('${child.key}')">Editar</button>
                            <button class="btn-deletar" onclick="deletarProduto('${child.key}')">Deletar</button>
                        </div>
                    </div>
                    <div class="cardapio-item-preco">R$ ${parseFloat(produto.preco).toFixed(2)}</div>
                    <div class="cardapio-item-detalhes">
                        📏 ${tamanhoInfo}<br>
                        ➕ ${complementoInfo}
                    </div>
                </div>
            `;

            cardapioLista.insertAdjacentHTML('beforeend', produtoHTML);
        });
    });
}

function deletarProduto(key) {
    if (confirm('Tem certeza que deseja deletar este produto?')) {
        database.ref(`cardapio/${key}`).remove().then(() => {
            alert('Produto deletado');
            carregarCardapio();
        });
    }
}

function editarProduto(key) {
    database.ref(`cardapio/${key}`).get().then(snapshot => {
        if (snapshot.exists()) {
            const produto = snapshot.val();
            document.getElementById('produtoFormTitulo').textContent = 'Editar Produto';
            document.getElementById('formProdutoNome').value = produto.nome;
            document.getElementById('formProdutoDescricao').value = produto.descricao || '';
            document.getElementById('formProdutoPreco').value = produto.preco;

            const tamanhosList = document.getElementById('tamanhosList');
            tamanhosList.innerHTML = '';
            if (produto.tamanhos) {
                produto.tamanhos.forEach(tam => {
                    const div = document.createElement('div');
                    div.className = 'tamanho-item';
                    div.innerHTML = `
                        <input type="text" value="${tam.nome}" required>
                        <input type="number" step="0.01" value="${tam.preco}" required>
                        <button type="button" class="btn-remover" onclick="this.parentElement.remove()">Remover</button>
                    `;
                    tamanhosList.appendChild(div);
                });
            }

            const complementosList = document.getElementById('complementosList');
            complementosList.innerHTML = '';
            if (produto.complementos) {
                produto.complementos.forEach(comp => {
                    const div = document.createElement('div');
                    div.className = 'complemento-item-admin';
                    div.innerHTML = `
                        <input type="text" value="${comp.nome}" required>
                        <input type="number" step="0.01" value="${comp.preco}" required>
                        <button type="button" class="btn-remover" onclick="this.parentElement.remove()">Remover</button>
                    `;
                    complementosList.appendChild(div);
                });
            }

            // Salvar o ID para atualizar depois
            produtoForm.dataset.editKey = key;
            abrirModal('produtoFormModal');
        }
    });
}

// Atualizar submit do formulário para edição
produtoForm.addEventListener('submit', (e) => {
    if (produtoForm.dataset.editKey) {
        e.preventDefault();

        const nome = document.getElementById('formProdutoNome').value;
        const descricao = document.getElementById('formProdutoDescricao').value;
        const preco = document.getElementById('formProdutoPreco').value;

        const tamanhos = Array.from(document.getElementById('tamanhosList').children).map(item => ({
            nome: item.querySelector('input:nth-child(1)').value,
            preco: parseFloat(item.querySelector('input:nth-child(2)').value)
        }));

        const complementos = Array.from(document.getElementById('complementosList').children).map(item => ({
            nome: item.querySelector('input:nth-child(1)').value,
            preco: parseFloat(item.querySelector('input:nth-child(2)').value)
        }));

        const produto = {
            nome,
            descricao,
            preco: parseFloat(preco),
            tamanhos,
            complementos,
            dataCriacao: new Date().toLocaleString()
        };

        database.ref(`cardapio/${produtoForm.dataset.editKey}`).set(produto).then(() => {
            alert('Produto atualizado!');
            fecharModal('produtoFormModal');
            produtoForm.reset();
            delete produtoForm.dataset.editKey;
            carregarCardapio();
        });
    }
});

// ==================== SEÇÃO ENTREGAS ====================
const btnAdicionarBairro = document.getElementById('btnAdicionarBairro');
const bairroFormModal = document.getElementById('bairroFormModal');
const bairroForm = document.getElementById('bairroForm');

btnAdicionarBairro.addEventListener('click', () => {
    bairroForm.reset();
    abrirModal('bairroFormModal');
});

bairroForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const nome = document.getElementById('formBairroNome').value;
    const taxa = document.getElementById('formBairroTaxa').value;

    database.ref(`entregas/${nome}`).set({
        nome,
        taxa: parseFloat(taxa),
        dataCriacao: new Date().toLocaleString()
    }).then(() => {
        alert('Bairro adicionado!');
        fecharModal('bairroFormModal');
        bairroForm.reset();
        carregarEntregas();
    });
});

function carregarEntregas() {
    const bairrosList = document.getElementById('bairrosList');
    bairrosList.innerHTML = '';

    databaseRef.entregas.on('value', snapshot => {
        bairrosList.innerHTML = '';

        if (!snapshot.exists()) {
            bairrosList.innerHTML = '<p>Nenhum bairro cadastrado</p>';
            return;
        }

        snapshot.forEach(child => {
            const bairro = child.val();

            const bairroHTML = `
                <div class="bairro-card">
                    <div class="bairro-nome">${bairro.nome || child.key}</div>
                    <div class="bairro-taxa">R$ ${parseFloat(bairro.taxa).toFixed(2)}</div>
                    <div class="bairro-acoes">
                        <button class="btn-editar" onclick="editarBairro('${child.key}', '${bairro.taxa}')">Editar</button>
                        <button class="btn-deletar" onclick="deletarBairro('${child.key}')">Deletar</button>
                    </div>
                </div>
            `;

            bairrosList.insertAdjacentHTML('beforeend', bairroHTML);
        });
    });
}

function editarBairro(key, taxa) {
    document.getElementById('formBairroNome').value = key;
    document.getElementById('formBairroNome').disabled = true;
    document.getElementById('formBairroTaxa').value = taxa;
    bairroForm.dataset.editKey = key;
    abrirModal('bairroFormModal');
}

function deletarBairro(key) {
    if (confirm('Tem certeza que deseja deletar este bairro?')) {
        database.ref(`entregas/${key}`).remove().then(() => {
            alert('Bairro deletado');
            carregarEntregas();
        });
    }
}

// Atualizar submit para edição de bairro
bairroForm.addEventListener('submit', (e) => {
    if (bairroForm.dataset.editKey) {
        e.preventDefault();

        const oldKey = bairroForm.dataset.editKey;
        const taxa = document.getElementById('formBairroTaxa').value;

        database.ref(`entregas/${oldKey}`).update({
            taxa: parseFloat(taxa)
        }).then(() => {
            alert('Bairro atualizado!');
            fecharModal('bairroFormModal');
            bairroForm.reset();
            document.getElementById('formBairroNome').disabled = false;
            delete bairroForm.dataset.editKey;
            carregarEntregas();
        });
    }
});

// ==================== SEÇÃO VENDAS ====================
function carregarVendas() {
    const hoje = new Date();
    const trinta = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

    document.getElementById('dataInicio').valueAsDate = trinta;
    document.getElementById('dataFim').valueAsDate = hoje;

    document.getElementById('btnFiltrarVendas').addEventListener('click', filtrarVendas);
    
    // Carregar dados iniciais
    filtrarVendas();
}

function filtrarVendas() {
    const dataInicio = new Date(document.getElementById('dataInicio').value).getTime();
    const dataFim = new Date(document.getElementById('dataFim').value).getTime() + 86400000; // +1 dia

    let totalVendas = 0;
    let totalPedidos = 0;
    const produtosVendidos = {};

    databaseRef.vendas.on('value', snapshot => {
        totalVendas = 0;
        totalPedidos = 0;
        Object.keys(produtosVendidos).forEach(k => delete produtosVendidos[k]);

        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const pedido = child.val();

                if (pedido.timestamp >= dataInicio && pedido.timestamp <= dataFim) {
                    totalVendas += pedido.total;
                    totalPedidos += 1;

                    pedido.itens.forEach(item => {
                        if (!produtosVendidos[item.produto]) {
                            produtosVendidos[item.produto] = { quantidade: 0, valor: 0 };
                        }
                        produtosVendidos[item.produto].quantidade += 1;
                        produtosVendidos[item.produto].valor += item.preco;
                    });
                }
            });
        }

        // Atualizar cards
        document.getElementById('totalVendas').textContent = totalVendas.toFixed(2);
        document.getElementById('totalPedidos').textContent = totalPedidos;
        document.getElementById('ticketMedio').textContent = (totalPedidos > 0 ? totalVendas / totalPedidos : 0).toFixed(2);

        // Ordenar produtos por quantidade
        const produtosOrdenados = Object.entries(produtosVendidos)
            .sort((a, b) => b[1].quantidade - a[1].quantidade)
            .slice(0, 10);

        // Renderizar tabela
        const container = document.getElementById('produtosMaisVendidos');
        container.innerHTML = `
            <div class="tabela-header">
                <div>Produto</div>
                <div>Quantidade</div>
                <div>Total</div>
            </div>
        `;

        produtosOrdenados.forEach(([nome, dados]) => {
            container.innerHTML += `
                <div class="tabela-row">
                    <div>${nome}</div>
                    <div>${dados.quantidade}</div>
                    <div>R$ ${dados.valor.toFixed(2)}</div>
                </div>
            `;
        });

        if (produtosOrdenados.length === 0) {
            container.innerHTML += '<p style="padding: 20px; text-align: center;">Nenhum produto vendido neste período</p>';
        }
    });
}

// ==================== SEÇÃO CONFIGURAÇÕES ====================
// Tabs de configuração
document.querySelectorAll('.config-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;

        document.querySelectorAll('.config-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.config-tab').forEach(t => t.classList.remove('show'));
        document.getElementById(tab + 'Tab').classList.add('show');
    });
});

// Salvar formas de pagamento
document.querySelectorAll('.forma-check').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        const forma = checkbox.dataset.forma;
        const ativo = checkbox.checked;

        database.ref(`admin/pagamentos/${forma}`).set(ativo);
    });
});

// PIX
document.getElementById('btnSalvarPix').addEventListener('click', () => {
    const chave = document.getElementById('pixChave').value;

    if (!chave) {
        alert('Digite a chave PIX');
        return;
    }

    database.ref('admin/pagamentos/pixChave').set(chave).then(() => {
        alert('Chave PIX salva!');
    });
});

// Impressoras
const btnAdicionarImpressora = document.getElementById('btnAdicionarImpressora');
const impressoraFormModal = document.getElementById('impressoraFormModal');
const impressoraForm = document.getElementById('impressoraForm');

btnAdicionarImpressora.addEventListener('click', () => {
    abrirModal('impressoraFormModal');
    atualizarDispositivosDisponiveis();
});

document.getElementById('btnAtualizarDispositivos').addEventListener('click', atualizarDispositivosDisponiveis);

async function atualizarDispositivosDisponiveis() {
    const select = document.getElementById('formImpressoraDispositivo');
    select.innerHTML = '<option value="">Carregando...</option>';

    try {
        // Simular listagem de impressoras (em produção usaria uma API real)
        const dispositivos = [
            { nome: 'Impressora Local 1', id: 'printer_1' },
            { nome: 'Impressora Local 2', id: 'printer_2' },
            { nome: 'Impressora Rede', id: 'printer_network' }
        ];

        select.innerHTML = '<option value="">Selecione uma impressora</option>';
        dispositivos.forEach(device => {
            const option = document.createElement('option');
            option.value = device.id;
            option.textContent = device.nome;
            select.appendChild(option);
        });
    } catch (error) {
        alert('Erro ao atualizar dispositivos: ' + error.message);
        select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

impressoraForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const impressora = {
        nome: document.getElementById('formImpressoraDispositivo').options[document.getElementById('formImpressoraDispositivo').selectedIndex].text,
        dispositivo: document.getElementById('formImpressoraDispositivo').value,
        tipoCorte: document.getElementById('formTipoCorte').value,
        larguraBobina: document.getElementById('formLarguraBobina').value,
        caracteresPorLinha: document.getElementById('formCaracteresPorLinha').value,
        dataCriacao: new Date().toLocaleString()
    };

    database.ref(`admin/impressoras/${Date.now()}`).set(impressora).then(() => {
        alert('Impressora adicionada!');
        fecharModal('impressoraFormModal');
        impressoraForm.reset();
        carregarImpressoras();
    });
});

function carregarImpressoras() {
    const impressorasList = document.getElementById('impressorasList');
    impressorasList.innerHTML = '';

    database.ref('admin/impressoras').on('value', snapshot => {
        impressorasList.innerHTML = '';

        if (!snapshot.exists()) {
            impressorasList.innerHTML = '<p>Nenhuma impressora cadastrada</p>';
            return;
        }

        snapshot.forEach(child => {
            const imp = child.val();

            const impHTML = `
                <div class="impressora-card">
                    <div class="impressora-nome">${imp.nome}</div>
                    <div class="impressora-config">
                        <strong>Tipo de Corte:</strong> ${imp.tipoCorte}<br>
                        <strong>Largura da Bobina:</strong> ${imp.larguraBobina}mm<br>
                        <strong>Caracteres por Linha:</strong> ${imp.caracteresPorLinha}
                    </div>
                    <button class="btn-deletar" style="margin-top: 10px; width: 100%;" onclick="deletarImpressora('${child.key}')">Deletar</button>
                </div>
            `;

            impressorasList.insertAdjacentHTML('beforeend', impHTML);
        });
    });
}

function deletarImpressora(key) {
    if (confirm('Tem certeza?')) {
        database.ref(`admin/impressoras/${key}`).remove().then(() => {
            alert('Impressora deletada');
            carregarImpressoras();
        });
    }
}

// Configurações gerais de impressão
document.getElementById('impressaoAutomatica').addEventListener('change', (e) => {
    document.getElementById('momentoImpressaoDiv').style.display = e.target.checked ? 'block' : 'none';
    database.ref('admin/impressao/automatica').set(e.target.checked);
});

document.getElementById('aprovacaoAutomatica').addEventListener('change', (e) => {
    database.ref('admin/impressao/aprovacaoAutomatica').set(e.target.checked);
});

// ==================== CARREGAR DADOS ADMIN ====================
function carregarDadosAdmin() {
    carregarCardapio();
    carregarEntregas();
    carregarImpressoras();
    carregarFormasPagamento();

    // Carregar configurações salvas
    database.ref('admin/pagamentos').get().then(snapshot => {
        if (snapshot.exists()) {
            const pagamentos = snapshot.val();
            document.querySelectorAll('.forma-check').forEach(checkbox => {
                const forma = checkbox.dataset.forma;
                checkbox.checked = pagamentos[forma] !== false;
            });
        }
    });

    database.ref('admin/pagamentos/pixChave').get().then(snapshot => {
        if (snapshot.exists()) {
            document.getElementById('pixChave').value = snapshot.val();
        }
    });

    database.ref('admin/impressao').get().then(snapshot => {
        if (snapshot.exists()) {
            const imp = snapshot.val();
            document.getElementById('aprovacaoAutomatica').checked = imp.aprovacaoAutomatica || false;
            document.getElementById('impressaoAutomatica').checked = imp.automatica || false;
            document.getElementById('momentoImpressaoDiv').style.display = imp.automatica ? 'block' : 'none';
        }
    });
}

// ==================== INICIALIZAR ====================
function inicializar() {
    // Criar área pública primeiro
    publicArea.classList.add('show');
    
    // Carregar cardápio público
    carregarCardapioPublico();
    carregarFormasPagamento();

    // Inicializar credenciais
    inicializarCredenciais();

    // Verificar se há token salvo
    if (localStorage.getItem('adminToken')) {
        fazerLogin();
    } else {
        adminArea.classList.remove('show');
    }
}

// Iniciar quando a página carregar
window.addEventListener('load', inicializar);
