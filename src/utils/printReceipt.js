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

    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
                    size: 58mm auto;
                }
                body {
                    font-family: 'Courier New', Courier, monospace;
                    width: 46mm; /* 58mm paper minus ~6mm margins each side */
                    margin: 0 auto;
                    padding: 2mm 0;
                    font-size: 10px;
                    color: black;
                    line-height: 1.2;
                }
                * { box-sizing: border-box; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .bold { font-weight: bold; }
                
                .header {
                    margin-bottom: 6px;
                    text-align: center;
                }
                .logo-img {
                    max-width: 120px;
                    max-height: 60px;
                    margin-bottom: 3px;
                    filter: grayscale(100%) contrast(200%) brightness(0.8);
                }
                .shop-name {
                    font-size: 13px;
                    font-weight: bold;
                    margin: 3px 0;
                    text-transform: uppercase;
                }
                .shop-info {
                    font-size: 8px;
                    margin-bottom: 1px;
                }
                
                .divider {
                    border-top: 1px dashed black;
                    margin: 5px 0;
                }
                
                .meta {
                    display: flex;
                    justify-content: space-between;
                    font-size: 8px;
                    margin-bottom: 3px;
                }
                
                .items {
                    margin-bottom: 5px;
                }
                .item {
                    margin-bottom: 4px;
                }
                .item-row {
                    display: flex;
                    justify-content: flex-start;
                    font-weight: bold;
                    font-size: 9px;
                    margin-bottom: 1px;
                }
                .qty {
                    width: 18px;
                    flex-shrink: 0;
                }
                .name {
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .price-row {
                    display: flex;
                    justify-content: flex-end;
                    font-size: 8px;
                    gap: 5px;
                }
                .price-total {
                    min-width: 35px;
                    text-align: right;
                }
                
                .totals {
                    margin-top: 5px;
                }
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 12px;
                    font-weight: bold;
                    margin-top: 3px;
                }
                
                .footer {
                    margin-top: 10px;
                    text-align: center;
                    font-size: 8px;
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
                <span>Date: ${dateStr}</span>
                <span>Time: ${timeStr}</span>
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
