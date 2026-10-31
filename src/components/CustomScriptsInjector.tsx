'use client';

import { useEffect } from 'react';
import { getCustomScriptsConfig, fetchCustomScriptsFromServer, CustomScriptsConfig } from '../utils/customScriptManager';

export function CustomScriptsInjector() {
  useEffect(() => {
    // Shield window.fetch against read-only getter assignments by third-party scripts/polyfills
    try {
      if (typeof window !== 'undefined') {
        let _f = window.fetch;
        Object.defineProperty(window, 'fetch', {
          get() { return _f; },
          set(v) { if (typeof v === 'function') _f = v; },
          configurable: true,
          enumerable: true
        });
      }
    } catch(e) {}

    function injectScripts(config: CustomScriptsConfig) {
      if (!config) return;

      // 1. Clean up previously injected elements
      document.querySelectorAll('[data-grouplinks-injected="true"]').forEach(el => el.remove());

      // Helper to append element and mark as injected
      const markInjected = (el: Element, section: 'head' | 'body') => {
        el.setAttribute('data-grouplinks-injected', 'true');
        el.setAttribute('data-grouplinks-section', section);
      };

      // 2. Google Analytics (only if not already loaded by layout Script)
      if (
        config.googleAnalyticsId &&
        config.googleAnalyticsId.trim() &&
        !document.querySelector('script[src*="googletagmanager.com/gtag"]')
      ) {
        const gaId = config.googleAnalyticsId.trim();
        // Insert gtag.js script
        const scriptGtag = document.createElement('script');
        scriptGtag.async = true;
        scriptGtag.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
        scriptGtag.onerror = () => {
          // Suppress unhandled external network/CSP errors
        };
        markInjected(scriptGtag, 'head');
        document.head.appendChild(scriptGtag);

        // Insert gtag init script
        const scriptInit = document.createElement('script');
        scriptInit.textContent = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `;
        markInjected(scriptInit, 'head');
        document.head.appendChild(scriptInit);
      }

      // 3. Google Site Verification
      if (config.googleVerificationCode && config.googleVerificationCode.trim()) {
        const raw = config.googleVerificationCode.trim();
        let contentVal = raw;
        const match = raw.match(/content=["']([^"']+)["']/i);
        if (match && match[1]) {
          contentVal = match[1];
        }

        const metaGoogle = document.createElement('meta');
        metaGoogle.name = 'google-site-verification';
        metaGoogle.content = contentVal;
        markInjected(metaGoogle, 'head');
        document.head.appendChild(metaGoogle);
      }

      // 4. Bing / MS Verification
      if (config.bingVerificationCode && config.bingVerificationCode.trim()) {
        const raw = config.bingVerificationCode.trim();
        let contentVal = raw;
        const match = raw.match(/content=["']([^"']+)["']/i);
        if (match && match[1]) {
          contentVal = match[1];
        }

        const metaBing = document.createElement('meta');
        metaBing.name = 'msvalidate.01';
        metaBing.content = contentVal;
        markInjected(metaBing, 'head');
        document.head.appendChild(metaBing);
      }

      // 5. Robust HTML & Script Injector
      const appendHtmlString = (htmlStr: string, targetEl: HTMLElement, section: 'head' | 'body') => {
        if (!htmlStr || !htmlStr.trim()) return;

        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlStr.trim(), 'text/html');

          // Extract all nodes from head and body of parsed document
          const extractedNodes: Node[] = [];
          
          // If the user pasted a full HTML head/body or just fragment tags
          if (doc.head && doc.head.childNodes.length > 0) {
            Array.from(doc.head.childNodes).forEach(n => extractedNodes.push(n));
          }
          if (doc.body && doc.body.childNodes.length > 0) {
            Array.from(doc.body.childNodes).forEach(n => extractedNodes.push(n));
          }

          // Fallback if parser didn't place them in head/body
          if (extractedNodes.length === 0) {
            const template = document.createElement('template');
            template.innerHTML = htmlStr.trim();
            Array.from(template.content.childNodes).forEach(n => extractedNodes.push(n));
          }

          extractedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;
              const tagName = el.tagName.toLowerCase();

              if (tagName === 'script') {
                // Create active executable script tag
                const scriptEl = document.createElement('script');
                Array.from(el.attributes).forEach(attr => {
                  scriptEl.setAttribute(attr.name, attr.value);
                });
                if (el.textContent) {
                  scriptEl.textContent = el.textContent;
                }
                markInjected(scriptEl, section);
                targetEl.appendChild(scriptEl);
              } else if (tagName === 'style') {
                const styleEl = document.createElement('style');
                Array.from(el.attributes).forEach(attr => {
                  styleEl.setAttribute(attr.name, attr.value);
                });
                styleEl.textContent = el.textContent || '';
                markInjected(styleEl, section);
                targetEl.appendChild(styleEl);
              } else {
                // Clone general element (div, meta, link, noscript, etc.)
                const cloned = el.cloneNode(true) as HTMLElement;
                markInjected(cloned, section);

                // Find and replace any nested scripts inside this container so they run
                const nestedScripts = Array.from(cloned.querySelectorAll('script'));
                nestedScripts.forEach(nestedOld => {
                  const nestedNew = document.createElement('script');
                  Array.from(nestedOld.attributes).forEach(attr => {
                    nestedNew.setAttribute(attr.name, attr.value);
                  });
                  nestedNew.textContent = nestedOld.textContent;
                  markInjected(nestedNew, section);
                  nestedOld.parentNode?.replaceChild(nestedNew, nestedOld);
                });

                targetEl.appendChild(cloned);
              }
            } else if (node.nodeType === Node.COMMENT_NODE) {
              // Optionally preserve comments for debugging in DOM inspection
              const commentNode = document.createComment(node.textContent || '');
              targetEl.appendChild(commentNode);
            }
          });
        } catch (err) {
          console.warn('Error injecting custom HTML string:', err);
        }
      };

      // Inject Custom Head Code
      if (config.customHeadCode && config.customHeadCode.trim()) {
        appendHtmlString(config.customHeadCode, document.head, 'head');
      }

      // Inject Custom Body / Footer Code
      if (config.customBodyCode && config.customBodyCode.trim()) {
        appendHtmlString(config.customBodyCode, document.body, 'body');
      }

      // Broadcast event with live active elements count
      try {
        const injectedElements = document.querySelectorAll('[data-grouplinks-injected="true"]');
        window.dispatchEvent(
          new CustomEvent('grouplinks_scripts_status', {
            detail: {
              activeCount: injectedElements.length,
              headCount: document.querySelectorAll('[data-grouplinks-section="head"]').length,
              bodyCount: document.querySelectorAll('[data-grouplinks-section="body"]').length,
              timestamp: Date.now(),
            },
          })
        );
      } catch {}
    }

    // Defer script injection until browser idle or next tick so hydration finishes cleanly
    const scheduleInjection = (fn: () => void) => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(fn, { timeout: 1500 });
      } else {
        setTimeout(fn, 150);
      }
    };

    scheduleInjection(() => {
      // Initial injection from local cache
      const initialConfig = getCustomScriptsConfig();
      injectScripts(initialConfig);

      // Fetch server-persisted configuration asynchronously to stay in sync
      fetchCustomScriptsFromServer().then(serverConfig => {
        if (serverConfig) {
          injectScripts(serverConfig);
        }
      }).catch(() => {});
    });

    // Listener for changes saved in Admin Panel
    const handleUpdate = (e: Event) => {
      const customEvt = e as CustomEvent<CustomScriptsConfig>;
      if (customEvt.detail) {
        injectScripts(customEvt.detail);
      }
    };

    window.addEventListener('grouplinks_scripts_updated', handleUpdate);
    return () => {
      window.removeEventListener('grouplinks_scripts_updated', handleUpdate);
    };
  }, []);

  return null;
}

