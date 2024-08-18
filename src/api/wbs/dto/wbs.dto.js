class WbsTicketDto {
    constructor(ticketSn, name, orderNum, parentSn, data, child) {
        this.ticketSn = ticketSn;
        this.name = name;
        this.orderNum = orderNum;
        if(parentSn !== null) this.parentSn = parentSn;
        if(data !== null) this.data = data;
        if(child !== null && child.length > 0) this.child = child;
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