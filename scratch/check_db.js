const db = require('../db');

async function check() {
    try {
        const tables = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
        console.log("Tablas:", tables.rows.map(t => t.table_name));
        
        const schemaVentas = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ventas'");
        console.log("Esquema Ventas:", schemaVentas.rows);

        const hasItems = tables.rows.find(t => t.table_name.includes('detalle') || t.table_name.includes('item'));
        if (hasItems) {
            const schemaItems = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${hasItems.table_name}'`);
            console.log(`Esquema ${hasItems.table_name}:`, schemaItems.rows);
        }
        process.exit(0);
    } catch(e) { console.error(e); process.exit(1); }
}
check();
