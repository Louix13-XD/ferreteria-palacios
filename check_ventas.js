const db = require('./db');

async function check() {
    try {
        const res = await db.query(`
            SELECT * FROM ventas WHERE codigo_boleta IN ('ORD-2708', 'ORD-4164')
        `);
        console.log('Ventas:');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

check();
