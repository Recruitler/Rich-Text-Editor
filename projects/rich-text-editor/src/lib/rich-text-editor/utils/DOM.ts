import { EmbeddedViewRef, TemplateRef, ViewContainerRef } from "@angular/core";
import { IImgInfo } from "../interfaces";

export function isRectEmpty(rect: DOMRect) {
  return rect.x == 0 && rect.y == 0 && rect.right == 0 && rect.bottom == 0;
}

function updateSelectionWithRange(range: Range): void {
  const selection = window.getSelection();
  selection?.removeAllRanges();
  if (range) {
    selection?.addRange(range);
  }
}

export function focusElementWithRangeIfNotFocused(
  element: HTMLElement,
  range: Range
): void {
  if (document.activeElement !== element) {
    element.focus();
  }
  updateSelectionWithRange(range);
}

export function focusElementWithRange(element: HTMLElement, range: Range) {
  if (document.activeElement !== element) {
    element.focus();
  }

  const selection = window.getSelection();
  selection?.removeAllRanges();
  range && selection?.addRange(range);
}

// COMPAT: In Firefox, `caretRangeFromPoint` doesn't exist. (2016/07/25)
export function getRangeFromPosition(x: number, y: number): Range | null {
  let domRange: Range | null = null;
  if (document.caretRangeFromPoint) {
    domRange = document.caretRangeFromPoint(x, y);
  } else {
    const position = (document as any).caretPositionFromPoint(x, y);

    if (position) {
      domRange = document.createRange();
      domRange.setStart(position.offsetNode, position.offset);
      domRange.setEnd(position.offsetNode, position.offset);
    }
  }

  return domRange;
}

export function findTextNodes(
  element: Element,
  pattern: string
): Array<{ text: Text; index: number }> {
  let textNodes: Array<{ text: Text; index: number }> = [];
  let matches: IterableIterator<RegExpMatchArray> | null = null;
  element.childNodes.forEach((child) => {
    if (
      child.nodeType == Node.TEXT_NODE &&
      child.textContent &&
      (matches = child.textContent.matchAll(new RegExp(pattern, "g")))
    ) {
      for (let match of matches) {
        match.index !== undefined &&
          textNodes.push({ index: match.index, text: child as Text });
      }
    }
  });
  textNodes.length % 2 == 1 && textNodes.pop();
  return textNodes;
}

function isHashtagElement(element: Element, pattern: RegExp): boolean {
  const textContent = Array.from(element.childNodes)
    .filter((child) => child.nodeType === Node.TEXT_NODE)
    .map((textNode) => textNode.textContent)
    .join("");

  return pattern.test(textContent);
}

function createHashtagElement(
  tag: string,
  value: any,
  template: TemplateRef<any>,
  viewContainer?: ViewContainerRef
): HTMLElement {
  const element = document.createElement("span");
  element.setAttribute("hashtag_component", tag);
  element.setAttribute("contenteditable", "false");

  const realHashtag = createRealHashtag(template, value, viewContainer);
  const hiddenHashtag = createHiddenHashtag(tag, value);

  element.appendChild(realHashtag);
  element.appendChild(hiddenHashtag);

  return element;
}

function createRealHashtag(
  template: TemplateRef<any>,
  value: any,
  viewContainer?: ViewContainerRef
): HTMLElement {
  const realHashtag = document.createElement("span");
  const viewRef: EmbeddedViewRef<Node> = template.createEmbeddedView({ value });
  viewContainer?.insert(viewRef);
  viewRef.detectChanges();

  viewRef.rootNodes.forEach((node) => realHashtag.appendChild(node));

  return realHashtag;
}

function createHiddenHashtag(tag: string, value: any): HTMLElement {
  const hiddenHashtag = document.createElement("span");
  hiddenHashtag.style.display = "none";
  hiddenHashtag.setAttribute("hashtag_code", tag);
  hiddenHashtag.innerHTML = `${tag}{"id":"${value.id}","name":"${value.name}","iLiked":"${value.iLiked}","nLikes":"${value.nLikes}","createdAt":"${value.createdAt}"}${tag}`;

  return hiddenHashtag;
}

export function createLiveHashtag(
  tag: string,
  value: any,
  template: TemplateRef<any>,
  viewContainer?: ViewContainerRef
): HTMLElement {
  return createHashtagElement(tag, JSON.parse(value), template, viewContainer);
}

export function createLiveImgtag(
  tag: string,
  value: any,
  imgInfo: IImgInfo,
  viewContainer?: ViewContainerRef
): HTMLElement {
  const element = document.createElement("img");
  element.src = `${imgInfo.domain}${
    imgInfo?.accountId ? imgInfo?.accountId + "/" : ""
  }${value}/${imgInfo?.variant || ""}`;
  element.alt = "Image";

  return element;
}

export function makeLiveHashtags(
  root: HTMLElement,
  tag: string,
  template: TemplateRef<any>,
  viewContainer?: ViewContainerRef
): any {
  return processLiveElements(
    root,
    tag,
    template,
    viewContainer,
    createLiveHashtag
  );
}

export function makeLiveImagetags(
  root: HTMLElement,
  imgInfo: IImgInfo,
  tag: string
): any {
  return processLiveElements(root, tag, imgInfo, undefined, createLiveImgtag);
}

function processLiveElements(
  root: HTMLElement,
  tag: string,
  data: TemplateRef<any> | IImgInfo | undefined,
  viewContainer: ViewContainerRef | undefined,
  createLiveElement: Function
): any {
  const selection = window.getSelection();
  if (!selection) return;

  const pattern = new RegExp(`${tag}(.*?)${tag}`);
  const elements = Array.from(root.querySelectorAll("*")).filter((el) =>
    isHashtagElement(el, pattern)
  );

  if (isHashtagElement(root, pattern)) {
    elements.push(root);
  }

  const liveElements: any = [];

  elements.forEach((element) => {
    let textNodes = findTextNodes(element, tag);
    for (let i = 0; i < textNodes.length; i += 2) {
      const startNode = textNodes[i].text;
      const startIndex = textNodes[i].index + tag.length;
      const endNode = textNodes[i + 1].text;
      const endIndex = textNodes[i + 1].index;

      if (startNode !== endNode || !startNode.textContent) continue;

      let value = startNode.textContent.substring(startIndex, endIndex);

      const liveElement = createLiveElement(tag, value, data, viewContainer);

      const range = document.createRange();
      range.setStart(startNode, startIndex - tag.length);
      range.setEnd(endNode, endIndex + tag.length);

      selection.removeAllRanges();
      selection.addRange(range);
      range.extractContents();
      range.insertNode(liveElement);
      liveElements.push(liveElement);

      textNodes = findTextNodes(element, tag);
      i -= 2;
    }
  });

  selection.removeAllRanges();
  return liveElements;
}
