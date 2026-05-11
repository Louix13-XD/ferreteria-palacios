const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const db = require('./db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'ferreteria_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Cambiar a true si se usa HTTPS
}));

// Rutas Temporales
app.get('/', (req, res) => {
    res.render('index', { title: 'Ferretería Palacios - Inicio' });
});

app.get('/productos/:categoria', (req, res) => {
    const categoria = req.params.categoria;
    res.render('productos', { 
        title: `Categoría: ${categoria.charAt(0).toUpperCase() + categoria.slice(1)}`,
        categoria: categoria 
    });
});

app.get('/perfil', (req, res) => {
    res.render('perfil', { title: 'Mi Perfil - Ferretería Palacios' });
});

app.get('/historial', (req, res) => {
    res.render('historial', { title: 'Mi Historial de Compras - Ferretería Palacios' });
});

app.get('/login', (req, res) => {
    res.render('login', { title: 'Acceder - Ferretería Palacios' });
});

app.get('/carrito', (req, res) => {
    res.render('carrito', { title: 'Mi Carrito - Ferretería Palacios' });
});

app.get('/favoritos', (req, res) => {
    res.render('favoritos', { title: 'Mis Favoritos - Ferretería Palacios' });
});

app.get('/producto/:id', (req, res) => {
    res.render('detalle', { 
        title: 'Detalle del Producto - Ferretería Palacios',
        productId: req.params.id 
    });
});

app.get('/admin', (req, res) => {
    res.render('admin', { title: 'Panel de Administración - Ferretería Palacios' });
});

app.get('/admin/inventario', (req, res) => {
    res.render('admin_inventario', { title: 'Gestión de Inventario - Ferretería Palacios' });
});

console.log('DEBUG: Cargando rutas de admin...');
app.get('/admin/usuarios', (req, res) => {
    res.render('admin_usuarios', { title: 'Gestión de Usuarios - Ferretería Palacios' });
});

app.get('/admin/personal', (req, res) => {
    res.render('admin_personal', { title: 'Gestión de Personal - Ferretería Palacios' });
});

app.get('/admin/ventas', (req, res) => {
    res.render('admin_ventas', { title: 'Gestión de Ventas - Ferretería Palacios' });
});

app.get('/admin/reportes', (req, res) => {
    res.render('admin_reportes', { title: 'Reportes y Analítica - Ferretería Palacios' });
});

app.get('/checkout', (req, res) => {
    res.render('checkout', { title: 'Pago Seguro - Ferretería Palacios' });
});

app.get('/boleta/:id', (req, res) => {
    res.render('boleta', { 
        title: 'Boleta de Venta - Ferretería Palacios',
        orderId: req.params.id 
    });
});

// --- RUTAS DE API CON BASE DE DATOS ---
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await db.query('SELECT * FROM usuarios WHERE email = $1 OR username = $1', [username]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
        }
        
        const user = result.rows[0];
        if (user.estado !== 'Activo') {
            return res.status(403).json({ success: false, message: 'Cuenta desactivada' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
        }

        res.json({
            success: true,
            user: {
                id: user.codigo_interno || user.id,
                name: user.nombre_completo,
                email: user.email,
                phone: user.celular,
                address: user.direccion_zona,
                role: user.rol === 'Cliente' ? 'client' : user.rol
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { name, email, phone, password, address } = req.body;
        const check = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'El correo ya está registrado' });
        }

        const hashedPass = await bcrypt.hash(password, 10);
        await db.query(
            'INSERT INTO usuarios (nombre_completo, email, celular, password, direccion_zona, rol, estado) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [name, email, phone, hashedPass, address, 'Cliente', 'Activo']
        );

        res.json({ success: true, message: 'Cuenta creada con éxito' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

// --- APIS DE INVENTARIO ---
app.get('/api/categorias', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM categorias');
        res.json({ success: true, categories: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

app.get('/api/productos', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.*, c.nombre as category_name, u.nombre_completo as updated_by_name
            FROM productos p
            JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN usuarios u ON p.modificado_por = u.id
            ORDER BY p.id DESC
        `);
        res.json({ success: true, products: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener productos' });
    }
});

app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, categoria_id, descripcion, precio_base, precio_final, stock, imagen_url, modificado_por, marca } = req.body;
        await db.query(
            `INSERT INTO productos (nombre, categoria_id, descripcion, precio_base, precio_final, stock, imagen_url, estado, modificado_por, marca)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'Activo', $8, $9)`,
            [nombre, categoria_id, descripcion, precio_base, precio_final, stock, imagen_url, modificado_por, marca]
        );
        res.json({ success: true, message: 'Producto creado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al crear producto' });
    }
});

app.put('/api/productos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, categoria_id, descripcion, precio_base, precio_final, stock, imagen_url, modificado_por, marca } = req.body;
        await db.query(
            `UPDATE productos 
             SET nombre=$1, categoria_id=$2, descripcion=$3, precio_base=$4, precio_final=$5, stock=$6, imagen_url=$7, modificado_por=$8, marca=$9
             WHERE id=$10`,
            [nombre, categoria_id, descripcion, precio_base, precio_final, stock, imagen_url, modificado_por, marca, id]
        );
        res.json({ success: true, message: 'Producto actualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al actualizar producto' });
    }
});

app.delete('/api/productos/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM productos WHERE id=$1', [req.params.id]);
        res.json({ success: true, message: 'Producto eliminado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al eliminar producto' });
    }
});

// --- APIS DE VENTAS Y CHECKOUT ---
app.post('/api/ventas', async (req, res) => {
    const client = await db.connect();
    try {
        const { cliente_id, total_venta, metodo_pago, direccion_envio, detalles } = req.body;
        const codigo_boleta = 'ORD-' + Math.floor(Math.random() * 9000 + 1000); 
        
        await client.query('BEGIN');
        
        const resultVenta = await client.query(
            `INSERT INTO ventas (codigo_boleta, cliente_id, total_venta, metodo_pago, direccion_envio, estado_pedido)
             VALUES ($1, $2, $3, $4, $5, 'Procesando') RETURNING id`,
            [codigo_boleta, cliente_id, total_venta, metodo_pago, direccion_envio]
        );
        const venta_id = resultVenta.rows[0].id;

        for (let item of detalles) {
            await client.query(
                `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
                 VALUES ($1, $2, $3, $4, $5)`,
                [venta_id, item.id, item.cantidad, item.precio, item.cantidad * item.precio]
            );
            await client.query(
                `UPDATE productos SET stock = stock - $1 WHERE id = $2`,
                [item.cantidad, item.id]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, codigo_boleta, venta_id });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al registrar venta:', error);
        res.status(500).json({ success: false, message: 'Error al registrar la venta' });
    } finally {
        client.release();
    }
});

app.get('/api/ventas', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT v.*, u.nombre_completo as cliente_nombre 
            FROM ventas v 
            JOIN usuarios u ON v.cliente_id = u.id 
            ORDER BY v.id DESC
        `);
        res.json({ success: true, ventas: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

app.get('/api/ventas/detalle/:codigo', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT v.*, u.nombre_completo as cliente_nombre 
            FROM ventas v 
            JOIN usuarios u ON v.cliente_id = u.id 
            WHERE v.codigo_boleta = $1
        `, [req.params.codigo]);
        
        if (result.rows.length === 0) {
            return res.json({ success: false, message: 'Venta no encontrada' });
        }
        
        const venta = result.rows[0];
        
        const detallesResult = await db.query(`
            SELECT dv.*, p.nombre as producto_nombre 
            FROM detalle_ventas dv 
            JOIN productos p ON dv.producto_id = p.id 
            WHERE dv.venta_id = $1
        `, [venta.id]);
        
        venta.items = detallesResult.rows;
        res.json({ success: true, venta });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

app.get('/api/ventas/cliente/:clienteId', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT * FROM ventas 
            WHERE cliente_id = $1 
            ORDER BY id DESC
        `, [req.params.clienteId]);
        
        const ventas = result.rows;
        
        for (let i = 0; i < ventas.length; i++) {
            const detallesResult = await db.query(`
                SELECT dv.*, p.nombre as producto_nombre, p.imagen_url as img
                FROM detalle_ventas dv 
                JOIN productos p ON dv.producto_id = p.id 
                WHERE dv.venta_id = $1
            `, [ventas[i].id]);
            ventas[i].items = detallesResult.rows;
        }
        
        res.json({ success: true, ventas: ventas });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

app.delete('/api/ventas/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM ventas WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

// --- APIS DE USUARIOS / PERSONAL ---
app.get('/api/usuarios', async (req, res) => {
    try {
        const { rol } = req.query;
        let query = "SELECT * FROM usuarios ";
        let params = [];
        
        if (rol) {
            query += "WHERE rol = $1 ";
            params.push(rol);
        } else {
            // Por defecto, excluir clientes para no romper la gestión de personal actual
            query += "WHERE rol != 'Cliente' ";
        }
        
        query += "ORDER BY id DESC";
        const result = await db.query(query, params);
        res.json({ success: true, usuarios: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

app.post('/api/usuarios', async (req, res) => {
    try {
        const { codigo_interno, nombre_completo, username, email, dni, celular, direccion_zona, password, rol } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
            `INSERT INTO usuarios (codigo_interno, nombre_completo, username, email, dni, celular, direccion_zona, password, rol)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [codigo_interno, nombre_completo, username, email, dni, celular, direccion_zona, hashedPassword, rol]
        );
        res.json({ success: true, message: 'Usuario creado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al crear usuario' });
    }
});

app.put('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_completo, username, email, dni, celular, direccion_zona, rol, password } = req.body;
        
        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.query(
                `UPDATE usuarios SET nombre_completo=$1, username=$2, email=$3, dni=$4, celular=$5, direccion_zona=$6, rol=$7, password=$8 WHERE id=$9`,
                [nombre_completo, username, email, dni, celular, direccion_zona, rol, hashedPassword, id]
            );
        } else {
            await db.query(
                `UPDATE usuarios SET nombre_completo=$1, username=$2, email=$3, dni=$4, celular=$5, direccion_zona=$6, rol=$7 WHERE id=$8`,
                [nombre_completo, username, email, dni, celular, direccion_zona, rol, id]
            );
        }
        res.json({ success: true, message: 'Usuario actualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al actualizar usuario' });
    }
});

app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM usuarios WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
