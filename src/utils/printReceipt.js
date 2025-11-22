export const printReceipt = (order, items) => {
    const receiptWindow = window.open('', '_blank', 'width=300,height=600');

    const date = new Date().toLocaleString();
    const total = order.total_amount.toLocaleString();

    const itemsHtml = items.map(item => `
        <div class="item">
            <span class="qty">${item.quantity}x</span>
            <span class="name">${item.name}</span>
            <span class="price">${(item.price * item.quantity).toLocaleString()}</span>
        </div>
    `).join('');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt #${order.id.slice(0, 4)}</title>
            <style>
                body {
                    font-family: 'Courier New', Courier, monospace;
                    width: 280px; /* Standard 80mm thermal width approx */
                    margin: 0 auto;
                    padding: 10px;
                    font-size: 12px;
                    color: black;
                }
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                    border-bottom: 1px dashed black;
                    padding-bottom: 10px;
                }
                .logo {
                    font-size: 20px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .meta {
                    font-size: 10px;
                    margin-bottom: 5px;
                }
                .items {
                    margin-bottom: 20px;
                    border-bottom: 1px dashed black;
                    padding-bottom: 10px;
                }
                .item {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 5px;
                }
                .qty {
                    width: 30px;
                    font-weight: bold;
                }
                .name {
                    flex: 1;
                }
                .price {
                    text-align: right;
                }
                .total {
                    display: flex;
                    justify-content: space-between;
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 20px;
                }
                .footer {
                    text-align: center;
                    font-size: 10px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">KADÉ</div>
                <div class="meta">Fast-Casual Sri Lankan</div>
                <div class="meta">${date}</div>
                <div class="meta">Order #${order.id.slice(0, 4)}</div>
            </div>
            
            <div class="items">
                ${itemsHtml}
            </div>
            
            <div class="total">
                <span>TOTAL</span>
                <span>LKR ${total}</span>
            </div>
            
            <div class="footer">
                <p>Thank you for dining with us!</p>
                <p>www.kade.local</p>
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
