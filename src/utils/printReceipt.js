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
            <div class="item-name">${item.quantity}x ${name}</div>
            <div class="item-price">
                <span>@ ${price.toLocaleString()}</span>
                <span class="total">${itemTotal.toLocaleString()}</span>
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
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Arial', 'Helvetica', sans-serif;
                    width: 48mm;
                    max-width: 48mm;
                    overflow: hidden;
                    padding: 2mm 1mm;
                    font-size: 11px;
                    color: #000;
                    line-height: 1.3;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }

                .header {
                    text-align: center;
                    margin-bottom: 4px;
                }
                .logo-img {
                    width: 100%;
                    height: auto;
                    margin-bottom: 4px;
                    filter: grayscale(100%) contrast(150%);
                }
                .shop-name {
                    font-size: 14px;
                    font-weight: 900;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                }
                .shop-info {
                    font-size: 9px;
                    line-height: 1.4;
                }

                .divider {
                    border: none;
                    border-top: 1px dashed #000;
                    margin: 4px 0;
                }

                .meta-line {
                    font-size: 10px;
                    font-weight: 700;
                    margin-bottom: 2px;
                    overflow: hidden;
                }
                .meta-line .left { float: left; }
                .meta-line .right { float: right; }

                .item {
                    margin-bottom: 4px;
                }
                .item-name {
                    font-size: 11px;
                    font-weight: 700;
                    word-wrap: break-word;
                }
                .item-price {
                    font-size: 10px;
                    text-align: right;
                }
                .item-price .total {
                    font-weight: 700;
                    margin-left: 8px;
                }

                .total-section {
                    margin-top: 2px;
                    overflow: hidden;
                    font-size: 13px;
                    font-weight: 900;
                }
                .total-section .left { float: left; }
                .total-section .right { float: right; }

                .footer {
                    margin-top: 6px;
                    text-align: center;
                    font-size: 9px;
                }
                .footer p {
                    margin: 1px 0;
                }
                .powered {
                    font-size: 7px;
                    margin-top: 3px;
                    color: #333;
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

            <div class="meta-line">
                <span class="left">Date: ${dateStr}</span>
                <span class="right">Time: ${timeStr}</span>
            </div>
            <div class="meta-line">
                <span class="left">Order: #${order.id ? order.id.slice(0, 4) : 'OFF'}</span>
            </div>

            <div class="divider"></div>

            <div class="items">
                ${itemsHtml}
            </div>

            <div class="divider"></div>

            <div class="total-section">
                <span class="left">TOTAL</span>
                <span class="right">LKR ${total}</span>
            </div>

            <div class="footer">
                <p>Thank you for your business!</p>
                <p>Please come again.</p>
                <p class="powered">Powered by Kade-OS</p>
            </div>

            <script>
                const logo = document.querySelector('.logo-img');
                const triggerPrint = () => {
                    setTimeout(() => { window.print(); }, 500);
                };
                if (logo) {
                    if (logo.complete) { triggerPrint(); }
                    else { logo.onload = triggerPrint; logo.onerror = triggerPrint; }
                } else { triggerPrint(); }
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
