const middlewareController = async(req, res, next) => {
    // xác nhận token
    const auth = req.cookies.auth;
    if (!auth) return res.redirect("/superadmin");
    next();
}

export default middlewareController;