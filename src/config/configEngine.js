import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const configViewEngine = (app) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Set the static files directory
    app.use(express.static(path.join(__dirname, '../public')));

    // Set EJS as the template engine
    app.set('view engine', 'ejs');

    // Set the views directory
    app.set('views', path.join(__dirname, '../views'));
};

export default configViewEngine;
