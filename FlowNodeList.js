class FlowNode {
	/**
	 optJson: option json
	 svg: svg
	 elm: node element
	 textElm: node text element
	 lines: 進入/離開此節點的流程線
	*/

	//node type
    TypeStart = 'S';
    TypeEnd = 'E';
    TypeNode = 'N';
    TypeAuto = 'A';	//??

	//drag evnet
	DragMove = 'dragmove';
	DragStart = 'dragstart';
	DragEnd = 'dragend';

    constructor(svg, optJson) {
        this.svg = svg;
        this.optJson = Object.assign({
            nodeType: this.TypeNode,
            x: 50,
            y: 50,
            width: 100,
            height: 50,
            text: 'Node',
        }, optJson);

        this._init();
    }

    _init() {
		//set instance variables
		this.lines = [];
		
        this._drawNode();	//draw node first
        this._setNodeDraggable();
        this._setConnectorDraggable(); // 讓connector可拖拉
    }

	addLine(line) {
		this.lines.push(line);
	}
	
	deleteLine(line) {
		let index = this.lines.findIndex(item => item.Id == line.Id);
		this.lines.splice(index, 1);
	}
	
	//init時呼叫
    _drawNode() {
        let nodeType = this.optJson.nodeType;
        let cssClass = '';
        let nodeName = '';

        if (this._isStartEnd()) {
            if (nodeType == this.TypeStart) {
                cssClass = 'xf-start';
                nodeName = this.TypeStart;
            } else {
                cssClass = 'xf-end';
                nodeName = this.TypeEnd;
            }

			//circle大小為0, 在css設定, 這時radius還沒確定, 不能move(會用到radius)
            this.elm = this.svg.circle()
                .addClass(cssClass);

			//移動circle時會參考radius, 所以先更新, 從css讀取radius, 而不是從circle建立的屬性 !!
            let style = window.getComputedStyle(this.elm.node);	//不能直接讀取circle屬性
            let radius = parseFloat(style.getPropertyValue("r"));	//轉浮點
            this.elm.attr("r", radius);
            this.elm.move(this.optJson.x, this.optJson.y);
			
			let width = radius * 2;
            this.optJson.width = width;		//寫入width, 供後面計算位置
            this.optJson.height = width;	//畫流程線時會用到
        } else {
            nodeName = this.optJson.text;
            cssClass = 'xf-node';
            this.elm = this.svg.rect(this.optJson.width, this.optJson.height)
                .addClass(cssClass)
                .move(this.optJson.x, this.optJson.y);
        }

		//節點文字
        this.textElm = this.svg.text(nodeName)
            .addClass(cssClass + '-text')
            .font({ anchor: 'middle' });

        //連接點 connector(在文字右側), 小方塊
		if (nodeType != this.TypeEnd)
			this.connectorElm = this.svg.rect(12, 12).addClass('xf-connector');
		
        this._render();
    }

	//是否為起迄節點
    _isStartEnd() {
        return (this.optJson.nodeType == this.TypeStart || this.optJson.nodeType == this.TypeEnd);
    }

	//繪製, 移動子元件
    _render() {
        let bbox = this.textElm.bbox();
		let centerX = this.elm.x() + this.optJson.width / 2;
		let centerY = this.elm.y() + this.optJson.height / 2;

		//文字
        this.textElm.move(centerX - bbox.width / 2, centerY - bbox.height / 2);

        //連接點
		if (this.connectorElm)
			this.connectorElm.move(centerX + bbox.width / 2 + 3, centerY - 5);
    }

	_setNodeDraggable() {
		this.elm.draggable().on(this.DragMove, () => {
			this._render();
			this.lines.forEach(line => line.render());
			
		//todo: temp add
		}).on(this.DragEnd, (event) => {	
			let { x, y } = event.detail.box;
			console.log(`x=${x}, y=${y}`);
		});
	}

	_setConnectorDraggable() {
		if (!this.connectorElm)
			return;
		
		let startX, startY;
		let tempLine;
		let overNode = null;

		// 啟用 connectorElm 的拖拽功能
		this.connectorElm.draggable().on(this.DragStart, (event) => {
			// 初始化線條
			let { x, y } = this.connectorElm.rbox(this.svg); // 使用 SVG 畫布的座標系
			startX = x;
			startY = y;

			tempLine = this.svg.line(startX, startY, startX, startY)
				.stroke({ width: 2, color: '#000' })
				.addClass('xf-line');
				
		}).on(this.DragMove, (event) => {
			//阻止 connector 移動
			event.preventDefault();
			
			// 獲取拖拽的目標座標（相對於 SVG 畫布）
			let { x, y } = event.detail.box;
			let endX = x;
			let endY = y;

			// 更新線條的終點
			tempLine.plot(startX, startY, endX, endY);

			// 檢查座標值是否有效
			if (isFinite(endX) && isFinite(endY)) {
				// 將 SVG 座標轉換為視口座標
				let svgRect = this.svg.node.getBoundingClientRect();
				let viewportX = endX + svgRect.x;
				let viewportY = endY + svgRect.y;

				// 檢查是否懸停在節點上
				let elements = document.elementsFromPoint(viewportX, viewportY);
				let nodeHovered = elements.find(elm => elm.classList.contains('xf-node') || elm.classList.contains('xf-end'));

				if (nodeHovered) {
					if (overNode !== nodeHovered) {
						if (overNode) overNode.style.stroke = '#000';
						overNode = nodeHovered;
						overNode.style.stroke = 'blue';
					}
				} else if (overNode) {
					overNode.style.stroke = '#000';
					overNode = null;
				}
			}
			
		}).on(this.DragEnd, (event) => {
			// 獲取拖拽的目標座標（相對於 SVG 畫布）
			let { x, y } = event.detail.box;
			let endX = x;
			let endY = y;

			// 檢查座標值是否有效
			if (isFinite(endX) && isFinite(endY)) {
				// 將 SVG 座標轉換為視口座標
				let svgRect = this.svg.node.getBoundingClientRect();
				let viewportX = endX + svgRect.x;
				let viewportY = endY + svgRect.y;

				// 檢查是否拖放到節點上
				let elements = document.elementsFromPoint(viewportX, viewportY);
				let dropNode = elements.find(elm => elm.classList.contains('xf-node') || elm.classList.contains('xf-end'));

				if (dropNode) {
					// 如果拖放到節點上，保留線條並連接到目標節點
					let dropBBox = dropNode.getBoundingClientRect();
					let dropCenterX = dropBBox.x + dropBBox.width / 2 - svgRect.x;
					let dropCenterY = dropBBox.y + dropBBox.height / 2 - svgRect.y;

					tempLine.plot(startX, startY, dropCenterX, dropCenterY);
				} else {
					// 如果沒有拖放到節點上，移除線條
					tempLine.remove();
				}

				if (overNode) {
					overNode.style.stroke = '#000';
					overNode = null;
				}
			}
		});
	}
}//class FlowNode


class FlowLine {
	//Cnt:中心點, Side:節點邊界, 數值20大約1公分
	Max1SegDist = 6;	//2中心點的最大距離, 小於此值可建立1線段(表示在同一水平/垂直位置), 同時用於折線圓角半徑
	Min2NodeDist = 25;	//2節點的最小距離, 大於此值可建立line(1,3線段)
	Min2SegDist = 20;	//建立2線段的最小距離, 中心點和邊

	//末端箭頭
	ArrowLen = 10; 	//長度
	ArrowWidth = 5; 	//寬度	

 	//line type, 起點位置
    TypeAuto = 'A';	//自動
    TypeV = 'V';	//垂直(上下)
    TypeH = 'H';	//水平(左右)

	/**
	 svg: svg
	 path: svg.path
	 fromNode: from node
	 toNode: to node
	 lineType: 起點位置, A(auto),U(上下),L(左右)
	 isTypeAuto:
	 isTypeV:
	 isTypeH:
	*/
	constructor(svg, fromNode, toNode, lineType) {
        this.svg = svg;
        this.fromNode = fromNode;
        this.toNode = toNode;
		this.path = this.svg.path('').addClass('xf-line');
		
		// 用來儲存箭頭的路徑
		this.arrowPath = this.svg.path('').addClass('xf-arrow');
		//this.arrowPath2 = this.svg.path('').addClass('xf-arrow');
		
		//add line to from/to node
		fromNode.addLine(this);
		toNode.addLine(this);
		this.setType(lineType);
		this.render();
    }

	setType(lineType){
		lineType = lineType || this.TypeAuto;
		this.lineType = lineType;
		this.isTypeV = (lineType == this.TypeV);
		this.isTypeH = (lineType == this.TypeH);
		//this.isTypeAuto = (!this.isTypeV && !this.isTypeH) || (lineType == this.TypeAuto);
	}
	
	/**
	 依次考慮使用1線段、2線段、3線段
	 */
	render() {

		//=== from Node ===
		// 位置和尺寸, x/y為左上方座標
		const fromX = this.fromNode.elm.x();	
		const fromY = this.fromNode.elm.y();
		const fromWidth = this.fromNode.optJson.width;
		const fromHeight = this.fromNode.optJson.height;
		const fromCntX = fromX + fromWidth / 2;		//中心點
		const fromCntY = fromY + fromHeight / 2;
		// 四個邊的中間點
		const fromUp = { x: fromX + fromWidth / 2, y: fromY }; // 上邊中點
		const fromDown = { x: fromX + fromWidth / 2, y: fromY + fromHeight };
		const fromLeft = { x: fromX, y: fromY + fromHeight / 2 };
		const fromRight = { x: fromX + fromWidth, y: fromY + fromHeight / 2 };

		//=== to Node ===
		const toX = this.toNode.elm.x();
		const toY = this.toNode.elm.y();
		const toWidth = this.toNode.optJson.width;
		const toHeight = this.toNode.optJson.height;
		const toCntX = toX + toWidth / 2;
		const toCntY = toY + toHeight / 2;
		// 四個邊的中間點
		const toUp = { x: toX + toWidth / 2, y: toY };
		const toDown = { x: toX + toWidth / 2, y: toY + toHeight };
		const toLeft = { x: toX, y: toY + toHeight / 2 };
		const toRight = { x: toX + toWidth, y: toY + toHeight / 2 };
		
		// 判斷 fromNode 和 toNode 的相對位置
		const isToRight = toCntX > fromCntX; 	// toNode 在 fromNode 的右側
		const isToDown = toCntY > fromCntY; 	// toNode 在 fromNode 的下方

		// 是否符合垂直/水平最小距離, 字尾H/V表示距離量測方向
		const match2NodeDistH = (isToRight ? toLeft.x - fromRight.x : fromLeft.x - toRight.x) >= this.Min2NodeDist;
		const match2NodeDistV = (isToDown ? toUp.y - fromDown.y : fromUp.y - toDown.y) >= this.Min2NodeDist;
		
		// 是否符合2中心點之間最小距離 for 1線段(否則為3線段)
		const match1SegDistH = Math.abs(fromCntX - toCntX) <= this.Max1SegDist;
		const match1SegDistV = Math.abs(fromCntY - toCntY) <= this.Max1SegDist;
		
		// 是否符合中心點-邊線之間最小距離 for 2線段
		const match2SegDistIn = Math.abs(fromCntX - toCntX) - toWidth/2 >= this.Min2SegDist;
		const match2SegDistOut = Math.abs(fromCntY - toCntY) - fromHeight/2 >= this.Min2SegDist;
		
		//判斷線段數目(1,2,3), 有4個象限, 先考慮上下再左右
		let fromPnt, toPnt;
		let points;
		//let pathStr;
		if (!this.isTypeH && match1SegDistH && match2NodeDistV){
			//1線段-垂直
			if (isToDown){
				fromPnt = fromDown;
				toPnt = toUp;
			} else {
				fromPnt = fromUp;
				toPnt = toDown;
			}
			//pathStr = `M ${fromPnt.x} ${fromPnt.y} V ${toPnt.y}`;	//取垂直線
			points = [fromPnt, {x:fromPnt.x, y:toPnt.y}];
		} else if(!this.isTypeV && match1SegDistV && match2NodeDistH){
			//1線段-水平
			if (isToRight){
				fromPnt = fromRight;
				toPnt = toLeft;
			} else {
				fromPnt = fromLeft;
				toPnt = toRight;
			}
			//pathStr = `M ${fromPnt.x} ${fromPnt.y} H ${toPnt.x}`;	//取水平線
			points = [fromPnt, {x:toPnt.x, y:fromPnt.y}];
		} else if(!this.isTypeV && match2NodeDistH && match2SegDistOut){
			//2線段-水平
			fromPnt = isToRight ? fromRight : fromLeft;
			toPnt = isToDown ? toUp : toDown;
			//pathStr = `M ${fromPnt.x} ${fromPnt.y} H ${toPnt.x} V ${toPnt.y}`;
			points = [fromPnt, {x:toPnt.x, y:fromPnt.y}, toPnt];
		} else if(!this.isTypeH && match2NodeDistV && match2SegDistIn){
			//2線段-垂直
			fromPnt = isToDown ? fromDown : fromUp;
			toPnt = isToRight ? toLeft : toRight;
			//pathStr = `M ${fromPnt.x} ${fromPnt.y} V ${toPnt.y} H ${toPnt.x}`;
			points = [fromPnt, {x:fromPnt.x, y:toPnt.y}, toPnt];
		} else if(!this.isTypeH && match2NodeDistV){
			//3線段-垂直(2節點內側)
			if (isToDown){
				fromPnt = fromDown;
				toPnt = toUp;
			} else {
				fromPnt = fromUp;
				toPnt = toDown;
			}
			
			let midY = (fromPnt.y + toPnt.y)/2;
			//pathStr = `M ${fromPnt.x} ${fromPnt.y} V ${midY} H ${toPnt.x} V ${toPnt.y}`;
			points = [fromPnt, {x:fromPnt.x, y:midY}, {x:toPnt.x, y:midY}, toPnt];
		} else if(!this.isTypeV && match2NodeDistH){
			//3線段-水平(2節點內側)
			if (isToRight){
				fromPnt = fromRight;
				toPnt = toLeft;
			} else {
				fromPnt = fromLeft;
				toPnt = toRight;
			}
			
			let midX = (fromPnt.x + toPnt.x)/2;
			//pathStr = `M ${fromPnt.x} ${fromPnt.y} H ${midX} V ${toPnt.y} H ${toPnt.x}`;
			points = [fromPnt, {x:midX, y:fromPnt.y}, {x:midX, y:toPnt.y}, toPnt];
		} else if(!this.isTypeV){
			//3線段-水平(2節點外側)
			if (isToRight){
				fromPnt = fromRight;
				toPnt = toRight;
			} else {
				fromPnt = fromLeft;
				toPnt = toLeft;
			}
			let midX = isToRight ? Math.max(fromPnt.x, toPnt.x) + this.Min2NodeDist : Math.min(fromPnt.x, toPnt.x) - this.MinSideSide;
			//pathStr = `M ${fromPnt.x} ${fromPnt.y} H ${midX} V ${toPnt.y} H ${toPnt.x}`;
			points = [fromPnt, {x:midX, y:fromPnt.y}, {x:midX, y:toPnt.y}, toPnt];
		} else {
			//其他狀況: 用直線(非折線)連接起迄點
			if (isToDown){
				if (isToRight){
					fromPnt = !this.isTypeH ? fromDown : fromRight;
					toPnt = toLeft;
				} else {
					fromPnt = !this.isTypeH ? fromDown : fromLeft;
					toPnt = toRight;
				}
			} else {
				if (isToRight){
					fromPnt = !this.isTypeH ? fromUp : fromRight;
					toPnt = toLeft;
				} else {
					fromPnt = !this.isTypeH ? fromUp : fromLeft;
					toPnt = toRight;
				}
			}
			//pathStr = `M ${fromPnt.x} ${fromPnt.y} L ${toPnt.x} ${toPnt.y}`;
			points = [fromPnt, toPnt];
		}
		
		// 繪製流程線
		this._drawLine(points);
		//this.path.plot(pathStr);
	}
	
	/**
	 畫流程線
	 */
	_drawLine(points) {
		// 生成帶有圓角的折線路徑
		let pathStr = `M ${points[0].x} ${points[0].y}`; // 移動到起點
		let pntLen = points.length;
		let radius = this.Max1SegDist;
		for (let i = 1; i < pntLen; i++) {
		  const prevPnt = points[i - 1];
		  const nowPnt = points[i];

		  // 計算圓角的路徑
		  if (i < pntLen - 1) {
			const nextPnt = points[i + 1];

			// 計算圓角的起始點和結束點
			const fromAngle = Math.atan2(nowPnt.y - prevPnt.y, nowPnt.x - prevPnt.x);
			const toAngle = Math.atan2(nextPnt.y - nowPnt.y, nextPnt.x - nowPnt.x);

			const fromOffsetX = radius * Math.cos(fromAngle);
			const fromOffsetY = radius * Math.sin(fromAngle);
			const toOffsetX = radius * Math.cos(toAngle);
			const toOffsetY = radius * Math.sin(toAngle);

			const arcStartX = nowPnt.x - fromOffsetX;
			const arcStartY = nowPnt.y - fromOffsetY;
			const arcEndX = nowPnt.x + toOffsetX;
			const arcEndY = nowPnt.y + toOffsetY;

			// 添加直線到圓角的起始點
			pathStr += ` L ${arcStartX} ${arcStartY}`;

			// 判斷圓弧的方向（順時針或逆時針）
			const angleDiff = toAngle - fromAngle;
			const sweepFlag = angleDiff > 0 ? 1 : 0; // 根據角度差決定 sweep-flag

			// 添加圓角（A 指令）
			pathStr += ` A ${radius} ${radius} 0 0 ${sweepFlag} ${arcEndX} ${arcEndY}`;
		  } else {
			// 最後一段直線
			pathStr += ` L ${nowPnt.x} ${nowPnt.y}`;
		  }
		}

		// 繪製流程線
		this.path.plot(pathStr);
		
		//畫末端箭頭
		this._arrow(points[pntLen - 2], points[pntLen - 1]);
		/*
		// 繪製帶有圓角的折線
		const path = svg.path(pathStr)
		  .stroke({ width: 2, color: '#000', linecap: 'round', linejoin: 'round' })
		  .fill('none');
		*/
	  
	}
	
	/**
	 畫末端箭頭, 利用2個傳入端點計算斜率
	 */
	_arrow(fromPnt, toPnt) {
		// 計算箭頭的方向
		const angle = Math.atan2(toPnt.y - fromPnt.y, toPnt.x - fromPnt.x); // 計算角度

		// 計算箭頭的2個點
		const arrowPnt1 = {
		  x: toPnt.x - this.ArrowLen * Math.cos(angle) + this.ArrowWidth * Math.cos(angle - Math.PI / 2),
		  y: toPnt.y - this.ArrowLen * Math.sin(angle) + this.ArrowWidth * Math.sin(angle - Math.PI / 2)
		};
		const arrowPnt2 = {
		  x: toPnt.x - this.ArrowLen * Math.cos(angle) + this.ArrowWidth * Math.cos(angle + Math.PI / 2),
		  y: toPnt.y - this.ArrowLen * Math.sin(angle) + this.ArrowWidth * Math.sin(angle + Math.PI / 2)
		};

		// 更新箭頭路徑
		this.arrowPath.plot(`M ${toPnt.x} ${toPnt.y} L ${arrowPnt1.x} ${arrowPnt1.y} M ${toPnt.x} ${toPnt.y} L ${arrowPnt2.x} ${arrowPnt2.y}`);
		//this.arrowPath1.plot(`M ${fromPnt.x} ${fromPnt.y} L ${toPnt.x} ${toPnt.y} M ${toPnt.x} ${toPnt.y} L ${arrowPnt1.x} ${arrowPnt1.y} M ${toPnt.x} ${toPnt.y} L ${arrowPnt2.x} ${arrowPnt2.y}`);
	}
	
}//class FlowLine
