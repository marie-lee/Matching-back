class WbsTicketDto {
    constructor(ticketSn, name, orderNum, parentSn, data, child) {
        this.ticketSn = ticketSn;
        this.name = name;
        this.orderNum = orderNum;
        this.parentSn = parentSn;
        this.data = data;
        this.child = child;
    }
}

class WbsDto {
    constructor(wbsData) {
        this.wbsData = wbsData;
    }
}

module.exports = {
    WbsTicketDto,
    WbsDto
};