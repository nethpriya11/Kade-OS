export const printReceipt = (order) => {
    const receiptWindow = window.open('', '_blank', 'width=300,height=600');

    if (!receiptWindow) {
        console.warn('Receipt popup blocked');
        alert('Please allow popups to print receipts');
        return;
    }

    const date = new Date().toLocaleString();
    // const total = order.total_amount.toLocaleString(); // Removed for KOT

    // Handle both data structures (direct items or nested order_items)
    const items = order.order_items || [];

    const itemsHtml = items.map(item => {
        const name = item.menu_items ? item.menu_items.name : item.name;
        return `
        <div class="item">
            <span class="qty">${item.quantity}x</span>
            <span class="name">${name}</span>
        </div>
    `}).join('');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>KOT #${order.id ? order.id.slice(0, 4) : 'OFF'}</title>
            <style>
                body {
                    font-family: 'Courier New', Courier, monospace;
                    width: 280px;
                    margin: 0 auto;
                    padding: 10px;
                    font-size: 14px; /* Larger font for kitchen */
                    color: black;
                    font-weight: bold;
                }
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                    border-bottom: 2px dashed black;
                    padding-bottom: 10px;
                }
                .logo {
                    font-size: 24px;
                    font-weight: 900;
                    margin-bottom: 5px;
                }
                .meta {
                    font-size: 12px;
                    margin-bottom: 5px;
                }
                .items {
                    margin-bottom: 20px;
                }
                .item {
                    display: flex;
                    justify-content: flex-start;
                    align-items: flex-start;
                    margin-bottom: 10px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 5px;
                }
                .qty {
                    width: 40px;
                    font-size: 18px;
                    font-weight: 900;
                }
                .name {
                    flex: 1;
                    font-size: 16px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">KOT</div>
                <div class="meta">Order #${order.id ? order.id.slice(0, 4) : 'OFF'}</div>
                <div class="meta">${date}</div>
            </div>
            
            <div class="items">
                ${itemsHtml}
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                    window.close();
                }
            </script>
        </body>
        </html>
    `;

    receiptWindow.document.write(html);
    receiptWindow.document.close();
};
