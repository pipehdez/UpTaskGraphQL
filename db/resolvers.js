const Usuario = require('../models/Usuario')
const Proyecto = require('../models/Proyecto')
const Tarea = require('../models/Tarea')

const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config({ path: 'variables.env' });

const crearToken = (usuario, secreta, expiresIn) =>{
    const { id, email, nombre } = usuario;

    return jwt.sign( {id, email, nombre }, secreta, { expiresIn } )
}

const resolvers = {
    Query: {
        obtenerProyectos: async (_, {}, ctx) => {
            const proyectos = await Proyecto.find({ creador: ctx.usuario.id })

            return proyectos;
        },
        obtenerTareas: async (_, { input }, ctx) => {
            const tareas = await Tarea.find({ creador: ctx.usuario.id })
                    .where('proyecto')
                        .equals(input.proyecto)

            return tareas;
        },
        filtrarProyectos: async (_, { input }, ctx) => {
            console.log(input.proyecto)
            const proyectos = await Proyecto.find({creador: ctx.usuario.id })
                    .where('nombre')
                        .equals(input.proyecto)

            return proyectos;
        }
    },
    Mutation: {
        crearUsuario: async (_, { input }) => {
            const { email, password } = input

            // Validar si el usuario existe
            const existeUsuario = await Usuario.findOne({ email })

            if (existeUsuario) {
                throw new Error('El usuario ya esta registrado')
            }

            try {

                // Hashear password
                const salt = await bcryptjs.genSalt(10)
                input.password = await bcryptjs.hash(password, salt)

                const nuevoUsuario = new Usuario(input)
                nuevoUsuario.save()

                return "Usuario creado correctamente";

            } catch (error) {
                console.log(error)
            }
        },
        autenticarUsuario: async (_, { input }) => {
            const { email, password } = input
            console.log(input)

            // Validar si el usuario existe
            const existeUsuario = await Usuario.findOne({ email })
            console.log(existeUsuario)

            if (!existeUsuario) {
                throw new Error('El usuario no esta registrado')
            }

            // Si el passwors es correto 
            const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password)
            
            if (!passwordCorrecto) {
                throw new Error("Contaseña incorracta")
            }

            return {
                token: crearToken(existeUsuario, process.env.SECRETA, '2hr')
            }

        },
        nuevoProyecto: async (_, { input }, ctx) => {

            try {
                const proyecto = new Proyecto(input);

                // Asociar creador
                proyecto.creador = ctx.usuario.id;

                // Almacenar en BD
                const resultado = await proyecto.save();

                return resultado;

            } catch (error) {
                console.log(error)
            }
        },
        actualizarProyecto: async (_, { id, input }, ctx ) => {
            // Revisar si el proyecto existe
            let proyecto = await Proyecto.findById(id);

            if (!proyecto) {
                throw new Error('Proyecto no encontrado')
            }

            // Revisar si el usuario es el creador
            if(proyecto.creador.toString() !== ctx.usuario.id){
                throw new Error('No tienes autorización para editar')
            }

            // Guardar el proyecto
            proyecto = await Proyecto.findOneAndUpdate({ _id: id }, input, { new: true })

            return proyecto;
        },
        eliminarProyecto: async (_, { id }, ctx) => {
            // Revisar si el proyecto existe
            let proyecto = await Proyecto.findById(id);

            if (!proyecto) {
                throw new Error('Proyecto no encontrado')
            }

            // Revisar si el usuario es el creador
            if(proyecto.creador.toString() !== ctx.usuario.id){
                throw new Error('No tienes autorización para eliminar')
            }

            // Eliminar el proyecto
            await Proyecto.findOneAndDelete({ _id: id })

            return "El proyecto fue eliminado";
        },
        nuevaTarea: async (_, { input }, ctx) => {
            try {
                const tarea = new Tarea(input)
                tarea.creador = ctx.usuario.id
                
                const resultado = await tarea.save()
                return resultado
            } catch (error) {
                console.log(error)
            }
        },
        actualizarTarea: async (_, { id, input, estado }, ctx) => {
            // Revisar si la tarea existe
            let tarea = await Tarea.findById(id);

            if (!tarea) {
                throw new Error('Tarea no encontrada')
            }

            // Revisar si el usuario es el creador
            if(tarea.creador.toString() !== ctx.usuario.id){
                throw new Error('No tienes autorización para editar')
            }

            // Asignar estado
            input.estado = estado

            // Guardar el proyecto
            tarea = await Tarea.findOneAndUpdate({ _id: id }, input, { new: true })

            return tarea;
        },
        eliminarTarea: async (_, { id }, ctx) => {
            // Revisar si la tarea existe
            let tarea = await Tarea.findById(id);

            if (!tarea) {
                throw new Error('Tarea no encontrada')
            }

            // Revisar si el usuario es el creador
            if(tarea.creador.toString() !== ctx.usuario.id){
                throw new Error('No tienes autorización para eliminar')
            }

            // Eliminar el tarea
            await Tarea.findOneAndDelete({ _id: id })

            return "La tarea fue eliminada";
        }
    }
}

module.exports = resolvers