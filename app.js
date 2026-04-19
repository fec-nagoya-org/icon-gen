const FRAME_SRC = "assets/frame.png";
const DEFAULT_SIZE = 400;

const canvas = document.getElementById("preview");
const ctx = canvas.getContext("2d");
const fileInput = document.getElementById("file-input");
const dropArea = document.getElementById("drop-area");
const controls = document.getElementById("controls");
const scaleInput = document.getElementById("scale");
const resetButton = document.getElementById("reset-button");
const reselectButton = document.getElementById("reselect-button");
const downloadLink = document.getElementById("download");

const state = {
	frameImage: null,
	userImage: null,
	offsetX: 0,
	offsetY: 0,
	scale: 1,
	baseScale: 1,
	dragging: false,
	dragStartX: 0,
	dragStartY: 0,
	dragOriginOffsetX: 0,
	dragOriginOffsetY: 0,
	activePointerId: null,
};

/**
 * フレーム画像を読み込み、canvas のサイズを合わせる
 */
const loadFrame = () => {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			state.frameImage = img;
			const size = img.naturalWidth || DEFAULT_SIZE;
			canvas.width = size;
			canvas.height = size;
			render();
			resolve();
		};
		img.onerror = reject;
		img.src = FRAME_SRC;
	});
};

/**
 * ユーザー画像を File から読み込み、state を初期化して再描画する
 * @param {File} file
 */
const loadUserFile = (file) => {
	if (!file || !file.type.startsWith("image/")) return;
	const reader = new FileReader();
	reader.onload = (e) => {
		const img = new Image();
		img.onload = () => {
			state.userImage = img;
			resetTransform();
			dropArea.classList.add("hidden");
			controls.hidden = false;
			render();
			updateDownloadHref();
		};
		img.src = e.target.result;
	};
	reader.readAsDataURL(file);
};

/**
 * ユーザー画像の位置とスケールを canvas 中央・cover フィットにリセットする
 */
const resetTransform = () => {
	if (!state.userImage) return;
	const w = state.userImage.naturalWidth;
	const h = state.userImage.naturalHeight;
	state.baseScale = Math.max(canvas.width / w, canvas.height / h);
	state.scale = 1;
	state.offsetX = (canvas.width - w * state.baseScale) / 2;
	state.offsetY = (canvas.height - h * state.baseScale) / 2;
	scaleInput.value = "1";
};

/**
 * state に基づいて canvas を再描画する
 */
const render = () => {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	if (state.userImage) {
		const w = state.userImage.naturalWidth;
		const h = state.userImage.naturalHeight;
		const drawScale = state.baseScale * state.scale;
		const drawW = w * drawScale;
		const drawH = h * drawScale;
		const cx = state.offsetX + (w * state.baseScale) / 2;
		const cy = state.offsetY + (h * state.baseScale) / 2;
		const drawX = cx - drawW / 2;
		const drawY = cy - drawH / 2;
		ctx.drawImage(state.userImage, drawX, drawY, drawW, drawH);
	}

	if (state.frameImage) {
		ctx.drawImage(state.frameImage, 0, 0, canvas.width, canvas.height);
	}
};

/**
 * ダウンロードリンクの href を現在の canvas 内容に更新する
 */
const updateDownloadHref = () => {
	canvas.toBlob((blob) => {
		if (!blob) return;
		if (downloadLink.dataset.objectUrl) {
			URL.revokeObjectURL(downloadLink.dataset.objectUrl);
		}
		const url = URL.createObjectURL(blob);
		downloadLink.href = url;
		downloadLink.dataset.objectUrl = url;
	}, "image/png");
};

/**
 * ポインター座標を canvas 座標系に変換する
 * @param {PointerEvent} e
 * @returns {{x: number, y: number}}
 */
const toCanvasCoords = (e) => {
	const rect = canvas.getBoundingClientRect();
	const scaleX = canvas.width / rect.width;
	const scaleY = canvas.height / rect.height;
	return {
		x: (e.clientX - rect.left) * scaleX,
		y: (e.clientY - rect.top) * scaleY,
	};
};

const onPointerDown = (e) => {
	if (!state.userImage) return;
	const { x, y } = toCanvasCoords(e);
	state.dragging = true;
	state.activePointerId = e.pointerId;
	state.dragStartX = x;
	state.dragStartY = y;
	state.dragOriginOffsetX = state.offsetX;
	state.dragOriginOffsetY = state.offsetY;
	canvas.setPointerCapture(e.pointerId);
};

const onPointerMove = (e) => {
	if (!state.dragging || e.pointerId !== state.activePointerId) return;
	const { x, y } = toCanvasCoords(e);
	state.offsetX = state.dragOriginOffsetX + (x - state.dragStartX);
	state.offsetY = state.dragOriginOffsetY + (y - state.dragStartY);
	render();
};

const onPointerUp = (e) => {
	if (e.pointerId !== state.activePointerId) return;
	state.dragging = false;
	state.activePointerId = null;
	canvas.releasePointerCapture?.(e.pointerId);
	updateDownloadHref();
};

const onWheel = (e) => {
	if (!state.userImage) return;
	e.preventDefault();
	const delta = -e.deltaY * 0.001;
	const next = Math.min(3, Math.max(0.1, state.scale + delta));
	state.scale = next;
	scaleInput.value = String(next);
	render();
	updateDownloadHref();
};

const onScaleInput = () => {
	if (!state.userImage) return;
	state.scale = Number(scaleInput.value);
	render();
};

const onScaleChange = () => {
	updateDownloadHref();
};

const onReset = () => {
	if (!state.userImage) return;
	resetTransform();
	render();
	updateDownloadHref();
};

const onReselect = () => {
	fileInput.value = "";
	fileInput.click();
};

const onFileChange = (e) => {
	const file = e.target.files?.[0];
	if (file) loadUserFile(file);
};

const onDragOver = (e) => {
	e.preventDefault();
	dropArea.classList.add("border-accent", "bg-accent/10");
};

const onDragLeave = () => {
	dropArea.classList.remove("border-accent", "bg-accent/10");
};

const onDrop = (e) => {
	e.preventDefault();
	dropArea.classList.remove("border-accent", "bg-accent/10");
	const file = e.dataTransfer?.files?.[0];
	if (file) loadUserFile(file);
};

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", onPointerUp);
canvas.addEventListener("wheel", onWheel, { passive: false });

scaleInput.addEventListener("input", onScaleInput);
scaleInput.addEventListener("change", onScaleChange);
resetButton.addEventListener("click", onReset);
reselectButton.addEventListener("click", onReselect);
fileInput.addEventListener("change", onFileChange);

dropArea.addEventListener("dragover", onDragOver);
dropArea.addEventListener("dragleave", onDragLeave);
dropArea.addEventListener("drop", onDrop);

loadFrame().catch((error) => {
	const message = error instanceof Error ? error.message : "Unknown error";
	console.error("Failed to load frame image:", message);
});
