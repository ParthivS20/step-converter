import { getInput } from '@actions/core'
import { exec } from '@actions/exec'
import * as fs from 'fs'

const ACTION_PATH = getInput('action-path', { required: true })

const FORMATS = ['sch_pdf', 'pcb_pdf', 'png', 'stl', 'step']

const outFiles = getInput('out-files', { required: true }).split(/\r\n|\r|\n/g)
const outDir = getInput('out-dir', { required: true });

(async () => {
    let needMayo = false
    outFiles.forEach((file) => {
        if (!FORMATS.includes(file)) {
            throw new Error(`Invalid out-file: ${file}`)
        }

        if (!needMayo && (file === 'step' || file === 'stl' || file === 'png')) {
            needMayo = true
        }
    })

    if (needMayo) {
        await exec('sh', [`${ACTION_PATH}/bin/install-mayo.sh`]).then(() => {
                console.log("mayo installed")
            }).catch((error) => {
                console.error("mayo install failed")
                throw error
            })
    }

    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true })
    }

    let mainDirFiles = fs.readdirSync('./')
    console.log(mainDirFiles)
    //let outDirFiles = fs.readdirSync(outDir)

    mainDirFiles.forEach(fileName => {
        if (fileName.endsWith("kicad_sch")) {
            let basename = fileName.replace(".kicad_sch", "")

        } else if (fileName.endsWith("kicad_pcb")) {
            let basename = fileName.replace(".kicad_pcb", "")
            if (outFiles.includes("step")) {
                exec('kicad-cli', ['pcb', 'export', 'step', '--subst-models', `-o ${outDir}/${basename}.step`, fileName]).then(() => {
                    console.log(`STEP export success: ${fileName}`)
                }).catch((error) => {
                    console.error("step export failed")
                    throw error
                })
            } else if (fs.existsSync(`${outDir}/${basename}.step`)) {
                if (outFiles.includes("stl")) {
                    exec('./mayo.AppImage', [`${outDir}/${basename}.step`, `-e ${outDir}/${basename}.stl`]).then(() => {
                        console.log(`STL export success: ${fileName}`)
                    }).catch((error) => {
                        console.error("stl export failed")
                        throw error
                    })
                } else if (outFiles.includes("png")) {
                    exec('./mayo.AppImage', [`-s ${ACTION_PATH}/mayo-config.ini`, `${outDir}/${basename}.step`, `-e ${outDir}/${basename}.png`]).then(() => {
                        console.log(`PNG export success: ${fileName}`)
                    }).catch((error) => {
                        console.error("png export failed")
                        throw error
                    })
                }
            }
        }
    })
})()


