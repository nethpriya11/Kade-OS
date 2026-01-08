export const printReceipt = (order) => {
    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    // Get the iframe's document
    const frameDoc = iframe.contentWindow.document;

    const date = new Date().toLocaleString();
    const total = order.total_amount ? parseFloat(order.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00';

    // Handle both data structures (direct items or nested order_items)
    const items = order.order_items || [];

    const itemsHtml = items.map(item => {
        const name = item.menu_items ? item.menu_items.name : item.name;
        const price = item.price_at_time || 0;
        const itemTotal = price * item.quantity;
        return `
        <div class="item">
            <div class="item-row">
                <span class="qty">${item.quantity}</span>
                <span class="name">${name}</span>
            </div>
            <div class="price-row">
                <span class="price-unit">@ ${price.toLocaleString()}</span>
                <span class="price-total">${itemTotal.toLocaleString()}</span>
            </div>
        </div>
    `}).join('');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt</title>
            <style>
                @page {
                    margin: 0;
                    size: auto;
                }
                body {
                    font-family: 'Courier New', Courier, monospace;
                    width: 280px; /* Standard 80mm printer width approx */
                    margin: 0;
                    padding: 10px 0;
                    font-size: 12px;
                    color: black;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .bold { font-weight: bold; }
                
                .header {
                    margin-bottom: 15px;
                    text-align: center;
                }
                .logo-img {
                    max-width: 150px;
                    max-height: 80px;
                    margin-bottom: 5px;
                    filter: grayscale(100%) contrast(150%);
                }
                .shop-name {
                    font-size: 18px;
                    font-weight: bold;
                    margin: 5px 0;
                    text-transform: uppercase;
                }
                .shop-info {
                    font-size: 10px;
                    margin-bottom: 2px;
                }
                
                .divider {
                    border-top: 1px dashed black;
                    margin: 10px 0;
                }
                
                .meta {
                    display: flex;
                    justify-content: space-between;
                    font-size: 10px;
                    margin-bottom: 5px;
                }
                
                .items {
                    margin-bottom: 10px;
                }
                .item {
                    margin-bottom: 8px;
                }
                .item-row {
                    display: flex;
                    justify-content: flex-start;
                    font-weight: bold;
                    margin-bottom: 2px;
                }
                .qty {
                    width: 25px;
                }
                .name {
                    flex: 1;
                }
                .price-row {
                    display: flex;
                    justify-content: flex-end;
                    font-size: 10px;
                    gap: 10px;
                }
                .price-total {
                    min-width: 40px;
                    text-align: right;
                }
                
                .totals {
                    margin-top: 10px;
                }
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 14px;
                    font-weight: bold;
                    margin-top: 5px;
                }
                
                .footer {
                    margin-top: 20px;
                    text-align: center;
                    font-size: 10px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="/logo.png" class="logo-img" alt="Logo" onerror="this.style.display='none'" />
                <div class="shop-name">Kade OS Shop</div>
                <div class="shop-info">123 Street Name, City</div>
                <div class="shop-info">Tel: 011-2345678</div>
            </div>
            
            <div class="divider"></div>
            
            <div class="meta">
                <span>Data: ${date.split(',')[0]}</span>
                <span>Time: ${date.split(',')[1]}</span>
            </div>
            <div class="meta">
                <span>Order: #${order.id ? order.id.slice(0, 4) : 'OFF'}</span>
            </div>
            
            <div class="divider"></div>
            
            <div class="items">
                ${itemsHtml}
            </div>
            
            <div class="divider"></div>
            
            <div class="totals">
                <div class="total-row">
                    <span>TOTAL</span>
                    <span>LKR ${total}</span>
                </div>
            </div>
            
            <div class="footer">
                <p>Thank you for your business!</p>
                <p>Please come again.</p>
                <p style="font-size: 8px; margin-top: 5px;">Powered by Kade-OS</p>
            </div>
            
            <script>
                // Wait for logo to load then print
                const logo = document.querySelector('.logo-img');
                
                const triggerPrint = () => {
                    setTimeout(() => {
                        window.print();
                    }, 500);
                };

                if (logo) {
                    if (logo.complete) {
                        triggerPrint();
                    } else {
                        logo.onload = triggerPrint;
                        logo.onerror = triggerPrint;
                    }
                } else {
                    triggerPrint();
                }
            </script>
        </body>
        </html>
    `;

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    // Clean up iframe after printing (give it enough time to be processed by the browser)
    setTimeout(() => {
        document.body.removeChild(iframe);
    }, 60000); // Remove after 1 minute
};
