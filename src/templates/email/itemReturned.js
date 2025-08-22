export const itemReturnedTemplate = (userData, rentalData) => {
  // Construct full name from user data
  const fullName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Item Returned - Rawlens</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0;
            background-color: #f5f7fa;
        }
        .content { 
            padding: 20px; 
            max-width: 600px; 
            margin: 0 auto;
            background-color: white;
        }
        .details { 
            background-color: #f0f8ff; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 20px 0; 
            border-left: 4px solid #1e3c72;
        }
        .detail-item { 
            margin: 10px 0; 
        }
        .label { 
            font-weight: bold; 
            color: #1e3c72; 
        }
        .footer { 
            background-color: #e3f2fd; 
            padding: 15px; 
            text-align: center; 
            font-size: 12px; 
            color: #1e3c72;
            margin-top: 20px;
        }
        .thank-you { 
            color: #1e3c72; 
            font-weight: bold; 
            font-size: 18px;
        }
        .section {
            margin: 20px 0;
        }
        .section h3 {
            color: #1e3c72;
            border-bottom: 2px solid #4dabf7;
            padding-bottom: 5px;
        }
        ul {
            color: #555;
        }
        .contact-info {
            background-color: #e3f2fd;
            padding: 15px;
            border-radius: 5px;
        }
        .title {
            color: #1e3c72;
            text-align: center;
        }
        .customer-name {
            color: #1e3c72;
            font-weight: bold;
            font-size: 20px;
            text-align: center;
            background-color: #e3f2fd;
            padding: 10px;
            border-radius: 5px;
            margin: 15px 0;
        }
        .success-message {
            color: #27ae60;
            font-weight: bold;
            font-size: 18px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="content">
        <h1 class="title">Item Returned Successfully!</h1>
        
        <div class="customer-name">
            Hello, ${fullName || 'Valued Customer'}!
        </div>
        
        <p class="success-message">Great news! Your item has been successfully returned.</p>
        
        <p>Thank you for choosing Rawlens. Our admin team has marked your item as returned, and your rental is now complete.</p>
        
        <div class="details">
            <h3>Rental Details:</h3>
            <div class="detail-item">
                <span class="label">Item:</span> ${rentalData.item_name}
            </div>
            <div class="detail-item">
                <span class="label">Returned Date:</span> ${new Date().toLocaleDateString()}
            </div>
            <div class="detail-item">
                <span class="label">Booking Reference:</span> ${rentalData.id.substring(0, 8).toUpperCase()}
            </div>
        </div>
        
        
        <div class="section">
            <h3>We'd Love to Hear From You!</h3>
            <p>Your feedback helps us improve our service. If you have a moment, please share your experience with us.</p>
        </div>
        
        <p>Thank you for trusting RawLens for your photography needs. We hope to serve you again soon!</p>
        <p>Best regards,<br>The RawLens Team</p>
    </div>
    
    <div class="footer">
        <p>© 2025 Rawlens. All rights reserved.</p>
        <p>Espana, Manila</p>
    </div>
</body>
</html>
`;
};