/**
 * =========================================
 * CORE SYSTEM v1.0 - script.js
 * Arquitectura: ES6 Modules Pattern
 * =========================================
 */

const CoreSystem = (() => {
    'use strict';

    // Configuración Central
    const Config = {
        activeClass: 'active',
        openClass: 'open',
        scrolledClass: 'scrolled'
    };

    /**
     * Módulo 1: Navegación Móvil y Scroll
     */
    const Navigation = {
        init() {
            const toggle = document.querySelector('.nav-toggle');
            const menu = document.querySelector('.nav-menu');
            const navbar = document.querySelector('.navbar');

            // Mobile Menu
            if (toggle && menu) {
                toggle.addEventListener('click', () => {
                    menu.classList.toggle(Config.activeClass);
                    const isExpanded = menu.classList.contains(Config.activeClass);
                    toggle.setAttribute('aria-expanded', isExpanded);
                });
            }

            // Navbar Scroll Effect
            window.addEventListener('scroll', () => {
                if (window.scrollY > 50) {
                    navbar.style.boxShadow = "var(--shadow-md)";
                } else {
                    navbar.style.boxShadow = "none";
                }
            });
        }
    };

    /**
     * Módulo 2: Sistema de Tabs (Pestañas)
     */
    const Tabs = {
        init() {
            const triggers = document.querySelectorAll('[data-tab-target]');
            
            triggers.forEach(trigger => {
                trigger.addEventListener('click', () => {
                    // 1. Obtener el target
                    const targetSelector = trigger.dataset.tabTarget;
                    const targetContent = document.querySelector(targetSelector);
                    const parent = trigger.parentElement; // .tabs-header
                    
                    if (!targetContent) return;

                    // 2. Limpiar clases activas en este grupo de tabs
                    parent.querySelectorAll('.tab-btn').forEach(t => t.classList.remove(Config.activeClass));
                    
                    // Asumimos que los contenidos son hermanos
                    targetContent.parentElement.querySelectorAll('.tab-content').forEach(c => c.classList.remove(Config.activeClass));

                    // 3. Activar el seleccionado
                    trigger.classList.add(Config.activeClass);
                    targetContent.classList.add(Config.activeClass);
                });
            });
        }
    };

    /**
     * Módulo 3: Gestor de Modales
     */
    const Modal = {
        init() {
            const openBtns = document.querySelectorAll('[data-modal-open]');
            const closeBtns = document.querySelectorAll('[data-modal-close]');
            const overlays = document.querySelectorAll('.modal-overlay');

            // Abrir
            openBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const modalId = btn.dataset.modalOpen;
                    const modal = document.getElementById(modalId);
                    if (modal) {
                        modal.classList.add(Config.openClass);
                        document.body.style.overflow = 'hidden'; // Prevenir scroll
                    }
                });
            });

            // Cerrar (Botón X)
            closeBtns.forEach(btn => {
                btn.addEventListener('click', () => this.closeAll());
            });

            // Cerrar (Click afuera)
            overlays.forEach(overlay => {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) this.closeAll();
                });
            });

            // Cerrar (Escape)
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.closeAll();
            });
        },

        closeAll() {
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove(Config.openClass));
            document.body.style.overflow = '';
        }
    };

    /**
     * Módulo 4: Animaciones al Scroll (Intersection Observer)
     */
    const ScrollReveal = {
        init() {
            const reveals = document.querySelectorAll('.reveal');
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add(Config.activeClass);
                        // Opcional: Dejar de observar una vez animado
                        observer.unobserve(entry.target); 
                    }
                });
            }, { threshold: 0.1 });

            reveals.forEach(el => observer.observe(el));
        }
    };

    // Inicializador Público
    return {
        init: () => {
            Navigation.init();
            Tabs.init();
            Modal.init();
            ScrollReveal.init();
            console.log('✅ CoreSystem: Inicializado para producción.');
        }
    };
})();

// Ejecutar al cargar el DOM
document.addEventListener('DOMContentLoaded', CoreSystem.init);
