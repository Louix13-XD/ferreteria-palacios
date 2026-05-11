const db = require('./db');

async function check() {
    try {
        const res = await db.query(`
            SELECT dv.*, v.codigo_boleta 
            FROM detalle_ventas dv 
            JOIN ventas v ON dv.venta_id = v.id 
            WHERE v.codigo_boleta IN ('ORD-2708', 'ORD-4164')
        `);
        console.log('Resultados de Detalle Ventas:');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

check();
