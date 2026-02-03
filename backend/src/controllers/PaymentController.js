class PaymentController {

    // Mock PIX data for now
    _getMockPixData(amount) {
        return {
            qrCodeImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADIAQMAAACXljzdAAAABlBMVEX///8AAABVwtN+AAABaklEQVR42u3aQW7DMAwEQO5/6fR2xY4lQZLgANbNn+x8JgG2s3Y7H4/H4/F4PJ7/L/p5x/yP+g/0P8h/Uf+h/kP9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/U/6j/Uf+j/kf9j/of9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/6n/Uf+j/kf9j/of9T/qf9T/qP9R/6P+R/2P+h/1P+p/1P+o/1H/o/5H/Y/6H/U/...',
            pixCopiaECola: '00020126580014BR.GOV.BCB.PIX0136a62202d2-2b2d-4b2d-8b2d-2b2d2b2d2b2d520400005303986540510.005802BR5925FULANO DE TAL - ME6008BRASILIA62070503***6304B1FF'
        };
    }

    async generatePix(req, res) {
        const { orderId } = req.params;
        // In a real scenario, fetch order amount from DB using orderId
        // const order = await prisma.order.findUnique({ where: { id: orderId } });
        
        // Return mock data
        const pixData = this._getMockPixData(0); // Pass amount if needed
        res.json(pixData);
    }

    async checkStatus(req, res) {
        const { orderId } = req.params;
        
        // Mock status check
        const isPaid = Math.random() > 0.7; // 30% chance
        
        if (isPaid) {
            // Update order status in DB if needed
            // await prisma.order.update(...)
        }

        res.json({ paid: isPaid });
    }
}

module.exports = new PaymentController();
