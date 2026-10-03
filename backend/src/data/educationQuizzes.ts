// GÉNÉRÉ par scripts/gen-education-catalog.mjs depuis data/education.js : ne pas modifier à la main.
// Quiz corrigés PAR LE SERVEUR : identifiants d'options (stables, voir data/quizIds.js) et identifiant de la bonne réponse.
export interface QuizQuestionSpec { id: string; options: string[]; correct: string }
export interface QuizSpec { passingScore: number; questions: QuizQuestionSpec[] }
export const EDUCATION_QUIZZES: Record<string, { chapters: Record<string, QuizSpec>; final: QuizSpec }> = {
  "stocks": {
    "chapters": {
      "1": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "oy8on9vpcj3",
              "oy0rtm6iafz",
              "o1zen775hx05",
              "o1p61g3k0n6w"
            ],
            "correct": "oy8on9vpcj3"
          },
          {
            "id": "2",
            "options": [
              "opmz7s82nn6",
              "o2af2t56zjnd",
              "o51zuf5a5ta",
              "o18xs48zjti3"
            ],
            "correct": "o2af2t56zjnd"
          },
          {
            "id": "3",
            "options": [
              "o2eyfdi018yo",
              "o231on31b716",
              "o1muk6ye8jtw",
              "o1g1zrnswl8e"
            ],
            "correct": "o231on31b716"
          },
          {
            "id": "4",
            "options": [
              "o175op0z4uha",
              "ot5s487e3pd",
              "o1zjwilzgasr",
              "ow8b6sgo0y4"
            ],
            "correct": "ot5s487e3pd"
          },
          {
            "id": "5",
            "options": [
              "oa7798iaa5q",
              "o2f4s9gemwyw",
              "o1dnxn4s2u4",
              "o1nstj8svy03"
            ],
            "correct": "o2f4s9gemwyw"
          }
        ]
      },
      "2": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "o1dp0h5ascsh",
              "ogqr8gx5y1w",
              "o1hrc1er8hyy",
              "olfeeyofke2"
            ],
            "correct": "o1dp0h5ascsh"
          },
          {
            "id": "2",
            "options": [
              "o1ufa934t194",
              "o1lmcjuevi33",
              "o28jlkznwbsp",
              "o138dvdf44qv"
            ],
            "correct": "o1lmcjuevi33"
          },
          {
            "id": "3",
            "options": [
              "ox7fnicw2pz",
              "ounbx5v0z8j",
              "o172hjtf1757",
              "o1fu2khu130h"
            ],
            "correct": "ounbx5v0z8j"
          },
          {
            "id": "4",
            "options": [
              "o11x5uzbj4zy",
              "o1ff0y25h9ug",
              "omox87phe49",
              "o1x43ym0l5nw"
            ],
            "correct": "o1ff0y25h9ug"
          },
          {
            "id": "5",
            "options": [
              "o2fmzm02cbg3",
              "o2122d5bks2k",
              "o1cmuvv1c8kw",
              "o145uzoqj8q9"
            ],
            "correct": "o2122d5bks2k"
          }
        ]
      },
      "3": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "o1nqgma4xjs2",
              "ovm32a7bom1",
              "ovwfcxdvmzm",
              "o20s7h746671"
            ],
            "correct": "ovm32a7bom1"
          },
          {
            "id": "2",
            "options": [
              "oqykqmdpbtn",
              "o21x0n6zil7",
              "o1r91rmqomh8",
              "oy47aemxl1q"
            ],
            "correct": "o21x0n6zil7"
          },
          {
            "id": "3",
            "options": [
              "o17cwg48kuyj",
              "o10m4ixjckao",
              "oo2gdm3xh06",
              "o2evb3ymvhuz"
            ],
            "correct": "o10m4ixjckao"
          },
          {
            "id": "4",
            "options": [
              "o28i22erty43",
              "o1ks8c219l7u",
              "o12kgmv9b4fk",
              "oqtrjjyykos"
            ],
            "correct": "o1ks8c219l7u"
          },
          {
            "id": "5",
            "options": [
              "ounfv5xgoq8",
              "o1e7j605ppdv",
              "o166l7kt1qu6",
              "o2fs8nq7a4iq"
            ],
            "correct": "o1e7j605ppdv"
          }
        ]
      },
      "4": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "o37oilofpph",
              "ornlx9a2v3l",
              "o1yjrzek4mwz",
              "o2dj0u1giknw"
            ],
            "correct": "o37oilofpph"
          },
          {
            "id": "2",
            "options": [
              "oepl4hllaxn",
              "o1vkf1of58y5",
              "o1a20xjui5u3",
              "o19yuz6m2550"
            ],
            "correct": "oepl4hllaxn"
          },
          {
            "id": "3",
            "options": [
              "otgonjjd4ai",
              "ou5nwyp1n9",
              "oom5b8n77xr",
              "o2efj50x49s2"
            ],
            "correct": "otgonjjd4ai"
          },
          {
            "id": "4",
            "options": [
              "o1xj8m173r11",
              "oc65up8o6hd",
              "of0z7dkvyox",
              "o2csqeh7lpsb"
            ],
            "correct": "oc65up8o6hd"
          },
          {
            "id": "5",
            "options": [
              "ocdojcgc57m",
              "o12j1ijgx6l9",
              "oqd9g1c68e2",
              "o1qd7vwrsfd3"
            ],
            "correct": "o12j1ijgx6l9"
          }
        ]
      },
      "5": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "oqqdmaba2ds",
              "oz73surea6i",
              "ohzp2o9e2w0",
              "o1m9yuylsuj9"
            ],
            "correct": "oz73surea6i"
          },
          {
            "id": "2",
            "options": [
              "o2fkha9g9e88",
              "o1cjl0yn2bzs",
              "o16ojn2jnogw",
              "obohy753xe6"
            ],
            "correct": "o1cjl0yn2bzs"
          },
          {
            "id": "3",
            "options": [
              "owfbxgtu2i6",
              "onitrylyh4z",
              "o1tixi5awtgr",
              "o218q0r18a1"
            ],
            "correct": "owfbxgtu2i6"
          },
          {
            "id": "4",
            "options": [
              "o299ubhhorll",
              "o1bgkusdocyy",
              "ox7cyd38upt",
              "o1hddlwx1ljk"
            ],
            "correct": "o1bgkusdocyy"
          },
          {
            "id": "5",
            "options": [
              "onyn1wgowbz",
              "o1z0n22wi0fo",
              "o1he520t2gdq",
              "o22xqf21l0ql"
            ],
            "correct": "o1z0n22wi0fo"
          }
        ]
      }
    },
    "final": {
      "passingScore": 75,
      "questions": [
        {
          "id": "1",
          "options": [
            "o1yl10fx5re4",
            "ooxex2dk1yh",
            "o1kgs55cnofa",
            "o12ywrbvkumd"
          ],
          "correct": "o1yl10fx5re4"
        },
        {
          "id": "2",
          "options": [
            "owby0b9ghpi",
            "o1yo2d2ln28y",
            "o1jxiwhcojom",
            "o1l6d1duoj9f"
          ],
          "correct": "owby0b9ghpi"
        },
        {
          "id": "3",
          "options": [
            "o2di88lyfkgl",
            "o400cy35rqy",
            "o24pjqx0qt4k",
            "oek66rsxuxp"
          ],
          "correct": "o2di88lyfkgl"
        },
        {
          "id": "4",
          "options": [
            "o8nbkleuag0",
            "o1z41ivl798i",
            "o1pccqo004j4",
            "o1s3d6z8vbch"
          ],
          "correct": "o8nbkleuag0"
        },
        {
          "id": "5",
          "options": [
            "onu73fk2ea9",
            "okb2gul8iyo",
            "o1anpy64cpxs",
            "o22qpxmur14"
          ],
          "correct": "onu73fk2ea9"
        },
        {
          "id": "6",
          "options": [
            "omdbwe2qaxo",
            "o27knjm7hdub",
            "o1k0yeknnkme",
            "ok2i8c4wtpv"
          ],
          "correct": "omdbwe2qaxo"
        },
        {
          "id": "7",
          "options": [
            "ok0ko6tla7w",
            "o209pmg1gn92",
            "o164psktzwec",
            "ormplxqmt8m"
          ],
          "correct": "ok0ko6tla7w"
        },
        {
          "id": "8",
          "options": [
            "ob6xzsr2ve1",
            "o16zjcixau7v",
            "o6xvvum01bi",
            "o2b2vx7gj69a"
          ],
          "correct": "ob6xzsr2ve1"
        }
      ]
    }
  },
  "real_estate": {
    "chapters": {
      "1": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "o1iml2w0jveg",
              "o2eqj7cv3f5j",
              "o9w3eco7994",
              "o1o9gguakieb"
            ],
            "correct": "o2eqj7cv3f5j"
          },
          {
            "id": "2",
            "options": [
              "o13dyr8ugfaj",
              "or57y1ni2pn",
              "o19sop4tv3bq",
              "oprb6x28yq3"
            ],
            "correct": "or57y1ni2pn"
          },
          {
            "id": "3",
            "options": [
              "o72iemwjlq3",
              "o28oz0md7j8j",
              "ohd36t0nr80",
              "o1cehnbb4m8p"
            ],
            "correct": "o28oz0md7j8j"
          },
          {
            "id": "4",
            "options": [
              "o7kxgr758po",
              "o23yskdlkvo7",
              "o1u4wwd6ts4k",
              "o1d0cdz4bdz"
            ],
            "correct": "o23yskdlkvo7"
          },
          {
            "id": "5",
            "options": [
              "ofjfyjxdwx2",
              "o146i2hlfuyz",
              "o1i73u4ngvzl",
              "ojcvxvj3394"
            ],
            "correct": "o146i2hlfuyz"
          }
        ]
      },
      "2": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "o1ueqai5pk6d",
              "om28qve1oj1",
              "onzawop77ct",
              "o2g6346v81dg"
            ],
            "correct": "om28qve1oj1"
          },
          {
            "id": "2",
            "options": [
              "o1pg6mjol30s",
              "o3r2ixgmlh8",
              "o25ykl4uh3nt",
              "o1h4ly5ecl8e"
            ],
            "correct": "o1pg6mjol30s"
          },
          {
            "id": "3",
            "options": [
              "o161ee6bwl75",
              "o1je51xf1itr",
              "o1oa6bw1a3so",
              "o1zy2cfhswz3"
            ],
            "correct": "o1je51xf1itr"
          },
          {
            "id": "4",
            "options": [
              "o1zq8gz40g3u",
              "o16158ngacxy",
              "oqtqlwxuzdk",
              "o196rj34o3bw"
            ],
            "correct": "o1zq8gz40g3u"
          },
          {
            "id": "5",
            "options": [
              "ohn0wyjjlxp",
              "obol5r5voje",
              "o1d8sc2edimf",
              "o1hw8n9ypq4d"
            ],
            "correct": "obol5r5voje"
          }
        ]
      },
      "3": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "obkbropbrgv",
              "o1kije97wges",
              "o5t2zzjcfdn",
              "o1k2gom6rxb1"
            ],
            "correct": "obkbropbrgv"
          },
          {
            "id": "2",
            "options": [
              "o1la6kpkqtda",
              "o5qfpdj36v",
              "o24e7ojetdvo",
              "oyxblnkh2hr"
            ],
            "correct": "o1la6kpkqtda"
          },
          {
            "id": "3",
            "options": [
              "o2dsq07ssl63",
              "o133nj96qzxm",
              "o20kwwwbd5q0",
              "o1xlpllgg23e"
            ],
            "correct": "o133nj96qzxm"
          },
          {
            "id": "4",
            "options": [
              "oxuh48ifs5v",
              "o23wccdvbrcp",
              "o1eyg4lxkrin",
              "ow2gdrn8qzr"
            ],
            "correct": "oxuh48ifs5v"
          },
          {
            "id": "5",
            "options": [
              "o1jjvqjmyyqu",
              "o1440whfs20d",
              "ovoi2heg5gm",
              "o28uj7wjcdc9"
            ],
            "correct": "o1jjvqjmyyqu"
          }
        ]
      },
      "4": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "o261rj4fc2xp",
              "o23flwoj5ij7",
              "o10z2x1dk9sc",
              "oatatx7ps74"
            ],
            "correct": "o23flwoj5ij7"
          },
          {
            "id": "2",
            "options": [
              "o29uad0oj74",
              "os1n9w6j8xc",
              "o52trvhebcd",
              "osyluwxi4fj"
            ],
            "correct": "o29uad0oj74"
          },
          {
            "id": "3",
            "options": [
              "o1t5raewrb50",
              "o1jzpzrw6xrg",
              "o1hs9b7cbket",
              "osdlcopyl2b"
            ],
            "correct": "o1hs9b7cbket"
          },
          {
            "id": "4",
            "options": [
              "o1migi38hh8",
              "ob6j1qef8e",
              "oagcn4eg0n2",
              "o25hfi2x68ja"
            ],
            "correct": "o1migi38hh8"
          },
          {
            "id": "5",
            "options": [
              "o1s4m9lguxi5",
              "o1wvd8fkf4ke",
              "o3bfxq1kua5",
              "o27cms5o1q6d"
            ],
            "correct": "o1s4m9lguxi5"
          }
        ]
      },
      "5": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "o1su4u4ow6xh",
              "o1jzu9yn8ygf",
              "o1x9jvsocmw6",
              "o7ojwzbt47d"
            ],
            "correct": "o1su4u4ow6xh"
          },
          {
            "id": "2",
            "options": [
              "o2dqep3ptvc2",
              "o1l678eqa6fj",
              "o1dla23lomm1",
              "o22cqvw7bzgl"
            ],
            "correct": "o2dqep3ptvc2"
          },
          {
            "id": "3",
            "options": [
              "oxx0afapzr5",
              "o2aumnsx1kpi",
              "oye63lgjvge",
              "o2cffy2tnq2l"
            ],
            "correct": "o2aumnsx1kpi"
          },
          {
            "id": "4",
            "options": [
              "o1y10uzvu9rf",
              "o1yqanrq1gr3",
              "o10k99n0myhc",
              "o7wmoku6nyl"
            ],
            "correct": "o1yqanrq1gr3"
          },
          {
            "id": "5",
            "options": [
              "og48ulndbnx",
              "o1unvuj0ortz",
              "o2elfkzm5b6f",
              "o11llchrpi4x"
            ],
            "correct": "o1unvuj0ortz"
          }
        ]
      }
    },
    "final": {
      "passingScore": 75,
      "questions": [
        {
          "id": "1",
          "options": [
            "o262g3k5krua",
            "o222c5092cd",
            "o1why0h4ral1",
            "o1pupvqna2ul"
          ],
          "correct": "o262g3k5krua"
        },
        {
          "id": "2",
          "options": [
            "o224my270a96",
            "ogtile2xgy2",
            "oafqaa7f1mv",
            "o1e9naw58ttr"
          ],
          "correct": "o224my270a96"
        },
        {
          "id": "3",
          "options": [
            "oxqqfx7h31g",
            "o147y1pg57f",
            "oz61uvyr1dg",
            "o2brnmkgdtc6"
          ],
          "correct": "oxqqfx7h31g"
        },
        {
          "id": "4",
          "options": [
            "ot2ijhj3uhm",
            "o2cxatgqw5w5",
            "o8h0qy8jsox",
            "o2fa3ts4c7ol"
          ],
          "correct": "ot2ijhj3uhm"
        },
        {
          "id": "5",
          "options": [
            "o1ofb3cym5ke",
            "o29rn76iintg",
            "o2f3c6caufaf",
            "o1q4u4g8sg94"
          ],
          "correct": "o1ofb3cym5ke"
        },
        {
          "id": "6",
          "options": [
            "o1zu1mggrbb3",
            "o7k482s4i3w",
            "osh23lz4jye",
            "o2gnolojsmwh"
          ],
          "correct": "o1zu1mggrbb3"
        },
        {
          "id": "7",
          "options": [
            "o3jtt8vd19o",
            "o10kkonojh99",
            "o24lqpy81mz3",
            "o1l3khwyp022"
          ],
          "correct": "o3jtt8vd19o"
        },
        {
          "id": "8",
          "options": [
            "o284h7i3n6cc",
            "o6orexd80n1",
            "oka2kdeus3p",
            "o1trhax56xpd"
          ],
          "correct": "o284h7i3n6cc"
        }
      ]
    }
  },
  "crypto": {
    "chapters": {
      "1": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "o1wpdz65o3eg",
              "o1y5bb6bcmi8",
              "oxy4yjzfpab",
              "o10zi6en811f"
            ],
            "correct": "o1wpdz65o3eg"
          },
          {
            "id": "2",
            "options": [
              "o1wfn29r3o0v",
              "oufb6rwvjrz",
              "o1qiy92emyvy",
              "ov783oywn9n"
            ],
            "correct": "o1wfn29r3o0v"
          },
          {
            "id": "3",
            "options": [
              "o24sv65xnrhs",
              "ofwrfyji783",
              "o1ck8q459hbp",
              "o17aulxit1lp"
            ],
            "correct": "o24sv65xnrhs"
          },
          {
            "id": "4",
            "options": [
              "o1bacus7dpf0",
              "o1d628q91w8p",
              "o115o1prv1qc",
              "o115583won4p"
            ],
            "correct": "o1bacus7dpf0"
          },
          {
            "id": "5",
            "options": [
              "o13qv2yj4nzg",
              "o1eij605apjp",
              "o11y2punnsxu",
              "o1s88cqcepzb"
            ],
            "correct": "o13qv2yj4nzg"
          },
          {
            "id": "6",
            "options": [
              "o97j4ogofez",
              "oau67122yn5",
              "o234xxi1vaij",
              "o1v9b94ch2gz"
            ],
            "correct": "o97j4ogofez"
          },
          {
            "id": "7",
            "options": [
              "o2cgjoe9ed3t",
              "o16cmc3f1qec",
              "o1khqa837fmg",
              "o1rf90lnkmhd"
            ],
            "correct": "o2cgjoe9ed3t"
          },
          {
            "id": "8",
            "options": [
              "ob35gnldapl",
              "o1juwuglnxyv",
              "o14hwifv6mmn",
              "ocq5tw6gvvf"
            ],
            "correct": "ob35gnldapl"
          }
        ]
      },
      "2": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "o225r0b7p2dw",
              "o25hbz2yucbv",
              "ofs308nxb3a",
              "o197qb0hxf6u"
            ],
            "correct": "o225r0b7p2dw"
          },
          {
            "id": "2",
            "options": [
              "o251214atqmr",
              "o1a8jkaauxgy",
              "o15bcylp0n64",
              "o19s89zk3nmw"
            ],
            "correct": "o251214atqmr"
          },
          {
            "id": "3",
            "options": [
              "owyyfys5xyj",
              "o168xkq4ldrt",
              "o1ijg608h2oi",
              "o2gn5mdbg55i"
            ],
            "correct": "owyyfys5xyj"
          },
          {
            "id": "4",
            "options": [
              "o109wfre4prs",
              "o1r09yjp1fdm",
              "o2317f1x9zfx",
              "o1ei9txkjyx4"
            ],
            "correct": "o109wfre4prs"
          },
          {
            "id": "5",
            "options": [
              "o1s607ez1xep",
              "o23jjbtu7h03",
              "o1cw92p2s3ux",
              "o1m2fy9k9fnl"
            ],
            "correct": "o1s607ez1xep"
          },
          {
            "id": "6",
            "options": [
              "o17jtx48cwju",
              "o1npeej78yzr",
              "optq254ce6m",
              "o10d0lxra2tn"
            ],
            "correct": "o17jtx48cwju"
          },
          {
            "id": "7",
            "options": [
              "o14axuzt48fg",
              "o1xxu1ips979",
              "obz25ec53fb",
              "o1tk1ty8z941"
            ],
            "correct": "o14axuzt48fg"
          },
          {
            "id": "8",
            "options": [
              "o1wvc4hvpc2r",
              "o13d2rypxdzn",
              "o24blkuetza4",
              "o1oxakghvakq"
            ],
            "correct": "o1wvc4hvpc2r"
          }
        ]
      },
      "3": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "o1khxuphod86",
              "ofzquz3yj37",
              "o2eswn30ul9i",
              "o1q7z3pjlqh2"
            ],
            "correct": "o1khxuphod86"
          },
          {
            "id": "2",
            "options": [
              "o1drqls28msc",
              "o17krw9xmckv",
              "o1baxj2jc92v",
              "o1bp2lof5k45"
            ],
            "correct": "o1drqls28msc"
          },
          {
            "id": "3",
            "options": [
              "oo9b0ovwzir",
              "o14bvdkczoqb",
              "o2eanf2odrvp",
              "o22nhg95dohk"
            ],
            "correct": "oo9b0ovwzir"
          },
          {
            "id": "4",
            "options": [
              "o1ylqo2pwdlo",
              "olospqu7j79",
              "oupishcc32s",
              "o1shgnchumuw"
            ],
            "correct": "o1ylqo2pwdlo"
          },
          {
            "id": "5",
            "options": [
              "o142ti3df4vf",
              "o1f6dbd07f32",
              "o1q0hueskrbu",
              "o1vsssp38rre"
            ],
            "correct": "o142ti3df4vf"
          },
          {
            "id": "6",
            "options": [
              "o6ozo2dwem2",
              "o1srv7n5qa2a",
              "o2kwopqjrio",
              "oxck5ui6m48"
            ],
            "correct": "o6ozo2dwem2"
          },
          {
            "id": "7",
            "options": [
              "o25053s2ok9h",
              "o1w7bp494j41",
              "o2fp8p4k7n7y",
              "o1u0kpta8qq0"
            ],
            "correct": "o25053s2ok9h"
          },
          {
            "id": "8",
            "options": [
              "o395bw6ado6",
              "olxafjx0emy",
              "o2dicpfea51p",
              "o6vkvaodvx1"
            ],
            "correct": "o395bw6ado6"
          }
        ]
      },
      "4": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "ody79dcgrtz",
              "o6qy6tr5uj5",
              "o1i27s1ve2da",
              "on030ugxa6b"
            ],
            "correct": "ody79dcgrtz"
          },
          {
            "id": "2",
            "options": [
              "o1apxculn9zg",
              "o1wn5d3k6c2t",
              "o1fq7ts9pg6l",
              "orojqx4f5ly"
            ],
            "correct": "o1apxculn9zg"
          },
          {
            "id": "3",
            "options": [
              "o6cszw47nvm",
              "o1h12xo010th",
              "o1bfvsn1yzyn",
              "oxylkb8vmts"
            ],
            "correct": "o6cszw47nvm"
          },
          {
            "id": "4",
            "options": [
              "otr0kxnm64y",
              "o1s4lb6p26u9",
              "of0226qlz50",
              "o3tlkytczmk"
            ],
            "correct": "otr0kxnm64y"
          },
          {
            "id": "5",
            "options": [
              "o1dgi55wtct3",
              "o61rs5pd0h5",
              "o140u3k9xi0a",
              "omtopf38wb2"
            ],
            "correct": "o1dgi55wtct3"
          },
          {
            "id": "6",
            "options": [
              "o1m7p0x0b02g",
              "o27kp7dl5b6",
              "oqg3s1fm1b2",
              "o1spqbbaba80"
            ],
            "correct": "o1m7p0x0b02g"
          },
          {
            "id": "7",
            "options": [
              "o1npydsdtcnn",
              "oth1x7b3zci",
              "o2apellai12b",
              "o2c4rey22bow"
            ],
            "correct": "o1npydsdtcnn"
          },
          {
            "id": "8",
            "options": [
              "o2bt31kx0sna",
              "ohi4jn591za",
              "o1ngieodjpmi",
              "o1mu8gynuini"
            ],
            "correct": "o2bt31kx0sna"
          }
        ]
      },
      "5": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "o11y7s46vzah",
              "o11hz6skxftf",
              "o21oxuq6wtjk",
              "o2f0hbor3grq"
            ],
            "correct": "o11y7s46vzah"
          },
          {
            "id": "2",
            "options": [
              "o28gzffh0ld",
              "o113twi1gi5m",
              "o19ojpp4dsho",
              "o3crlbe1ljt"
            ],
            "correct": "o28gzffh0ld"
          },
          {
            "id": "3",
            "options": [
              "o1ctfu1snlhv",
              "ofdy2xot7pb",
              "o1f4gez5ct4e",
              "o20nhdmmdfv"
            ],
            "correct": "o1ctfu1snlhv"
          },
          {
            "id": "4",
            "options": [
              "o1mkxsn4ie5",
              "o20e741xrym9",
              "o1r12xdn9qi8",
              "ors4lhvm9jx"
            ],
            "correct": "o1mkxsn4ie5"
          },
          {
            "id": "5",
            "options": [
              "o19l2idu1qz3",
              "ovfia7i1zwt",
              "o1c5sl0pzln1",
              "o13e15jru1pi"
            ],
            "correct": "o19l2idu1qz3"
          },
          {
            "id": "6",
            "options": [
              "otw7gzjrwrb",
              "o1c7eoox9yp3",
              "o16374x6tcp3",
              "o1cc04l6umnr"
            ],
            "correct": "otw7gzjrwrb"
          },
          {
            "id": "7",
            "options": [
              "o1ubyv6nofq1",
              "ov6eanye4ti",
              "o1cwzs27m0hl",
              "ouabzlszntd"
            ],
            "correct": "o1ubyv6nofq1"
          },
          {
            "id": "8",
            "options": [
              "o16n1vbvnlrc",
              "ol7hykvrhgy",
              "o1tp6i64v5eg",
              "o1fl5xzdvbh5"
            ],
            "correct": "o16n1vbvnlrc"
          }
        ]
      },
      "6": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "o1kwaknpbicp",
              "o233sl1w11nz",
              "oalnpu6ibt",
              "on122yzyx0c"
            ],
            "correct": "o1kwaknpbicp"
          },
          {
            "id": "2",
            "options": [
              "ox55tdy2bmc",
              "o18v6l9zu1kp",
              "ogtg0p6edxd",
              "o1mq0nmku8f2"
            ],
            "correct": "ox55tdy2bmc"
          },
          {
            "id": "3",
            "options": [
              "o26g6oftk768",
              "o1qz7b26eu1j",
              "o2cc670nop6a",
              "o18ofokb42cw"
            ],
            "correct": "o26g6oftk768"
          },
          {
            "id": "4",
            "options": [
              "o1orc4q9u6ic",
              "omnhqslrtrd",
              "o12qhzo967ow",
              "ornpnbrgwzm"
            ],
            "correct": "o1orc4q9u6ic"
          },
          {
            "id": "5",
            "options": [
              "o1o5y0aojp8l",
              "o3a0l6t8u2h",
              "o2b0lm1jldkr",
              "of7jjd5yanu"
            ],
            "correct": "o1o5y0aojp8l"
          },
          {
            "id": "6",
            "options": [
              "ouyft2g6os2",
              "o1sxv0wsc97x",
              "oroa44l05ba",
              "oxez9n46jjn"
            ],
            "correct": "ouyft2g6os2"
          },
          {
            "id": "7",
            "options": [
              "o2fa1vzzhgb5",
              "o451raxzikn",
              "o91yadi7bjp",
              "ovenqlrl29q"
            ],
            "correct": "o2fa1vzzhgb5"
          },
          {
            "id": "8",
            "options": [
              "orv0r6sxogl",
              "oc48tcuy6d",
              "o265plt09cx9",
              "o8an2tx5fzg"
            ],
            "correct": "orv0r6sxogl"
          }
        ]
      },
      "7": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "o64jufs6euj",
              "o3ch9fn7usl",
              "o1hz3qb33bv9",
              "oop9ui27mdj"
            ],
            "correct": "o64jufs6euj"
          },
          {
            "id": "2",
            "options": [
              "o1avnalioiqc",
              "o7e3ewb4kug",
              "op98ukguev0",
              "o1j8yf903jr8"
            ],
            "correct": "o1avnalioiqc"
          },
          {
            "id": "3",
            "options": [
              "o15dml29cpqu",
              "o17x79cptmz8",
              "o18999hlgfju",
              "o212tlbhhb18"
            ],
            "correct": "o15dml29cpqu"
          },
          {
            "id": "4",
            "options": [
              "o25ge7occ96y",
              "o2vmm1dggpa",
              "o1vt3v7f0839",
              "o28ej7hutxq7"
            ],
            "correct": "o25ge7occ96y"
          },
          {
            "id": "5",
            "options": [
              "od64592b9o7",
              "o1udpwmb0676",
              "o2eednev38wi",
              "o24gdjh2yo0u"
            ],
            "correct": "od64592b9o7"
          },
          {
            "id": "6",
            "options": [
              "o1r6v0pb6i13",
              "ozkl3r5sx4b",
              "o272uo9yc417",
              "o123bmnpgcha"
            ],
            "correct": "o1r6v0pb6i13"
          },
          {
            "id": "7",
            "options": [
              "o12jcxwhx534",
              "ormgxobqo4f",
              "o1r4un8eh3jl",
              "oohcccf85i6"
            ],
            "correct": "o12jcxwhx534"
          },
          {
            "id": "8",
            "options": [
              "oyuab25f0au",
              "o16li506diq0",
              "oda45ji5qxd",
              "o1cw26osdq4e"
            ],
            "correct": "oyuab25f0au"
          }
        ]
      },
      "8": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "o1rk7k813of5",
              "o1ebam74st0b",
              "o12l2bu5clb",
              "o20y97zcam7r"
            ],
            "correct": "o1rk7k813of5"
          },
          {
            "id": "2",
            "options": [
              "ogav0b00ylz",
              "o6es7n0jxeo",
              "o1ishsjl2keg",
              "o1mf5879g0pl"
            ],
            "correct": "ogav0b00ylz"
          },
          {
            "id": "3",
            "options": [
              "o13wae8o1lwy",
              "o18zder0hvsh",
              "or8ps3mt3mx",
              "o4qmbwvxhly"
            ],
            "correct": "o13wae8o1lwy"
          },
          {
            "id": "4",
            "options": [
              "ozy9vxpq97l",
              "o7ym0y47t7p",
              "o1zg0c1timd7",
              "ooioyhmnwxj"
            ],
            "correct": "ozy9vxpq97l"
          },
          {
            "id": "5",
            "options": [
              "ojlhgy9fi1l",
              "odd4w4jb5af",
              "o1550it4modc",
              "o14sao6c9h16"
            ],
            "correct": "ojlhgy9fi1l"
          },
          {
            "id": "6",
            "options": [
              "o1gom57bu43t",
              "oywss5rsgrb",
              "o1m5krgmhwzh",
              "oc7ysnkyvpr"
            ],
            "correct": "o1gom57bu43t"
          },
          {
            "id": "7",
            "options": [
              "oksewukdw8g",
              "o1vgeidoyurg",
              "o1vdi1a2aqvs",
              "od5o1nse648"
            ],
            "correct": "oksewukdw8g"
          },
          {
            "id": "8",
            "options": [
              "o11wn7xkfrt9",
              "o22bad5obkvm",
              "osbd8lequ2s",
              "o126qwmyj69g"
            ],
            "correct": "o11wn7xkfrt9"
          }
        ]
      },
      "9": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "o2doljkvishq",
              "o10oqlnz1915",
              "o1owq1oqgikl",
              "oclihz20pbg"
            ],
            "correct": "o2doljkvishq"
          },
          {
            "id": "2",
            "options": [
              "owisc4sv8fl",
              "o1zqysit44xh",
              "oxt6nqbxmmy",
              "o67vvijwwrz"
            ],
            "correct": "owisc4sv8fl"
          },
          {
            "id": "3",
            "options": [
              "o1qrdk95wd34",
              "o6wo9b6hxh6",
              "ofzlv44pazh",
              "o1p20xwccsc5"
            ],
            "correct": "o1qrdk95wd34"
          },
          {
            "id": "4",
            "options": [
              "oyfui1iblmt",
              "o14eko7nsjad",
              "o1iv65cxvug9",
              "opr9ikfqpbb"
            ],
            "correct": "oyfui1iblmt"
          },
          {
            "id": "5",
            "options": [
              "ormh5z4tdr2",
              "o2998pxda0x1",
              "o26kr2gkprvv",
              "oz9iu4zykgp"
            ],
            "correct": "ormh5z4tdr2"
          },
          {
            "id": "6",
            "options": [
              "o24hl8pmicyi",
              "o166s1l7lwft",
              "o28m0scftjgp",
              "o1bpk8lcw71l"
            ],
            "correct": "o24hl8pmicyi"
          },
          {
            "id": "7",
            "options": [
              "oxiugrm54qq",
              "o2ehls9x8zk9",
              "o1vims8kagzn",
              "o28sb5mja23s"
            ],
            "correct": "oxiugrm54qq"
          },
          {
            "id": "8",
            "options": [
              "o1ey5r2lgkob",
              "o1q6rnhb4ty6",
              "o2bkizgtbo9a",
              "o6agou74t9c"
            ],
            "correct": "o1ey5r2lgkob"
          }
        ]
      },
      "10": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "omjowzcnox6",
              "o2dwbfh6pbe5",
              "o8bot1w8se7",
              "o1jchb3qm4j9"
            ],
            "correct": "omjowzcnox6"
          },
          {
            "id": "2",
            "options": [
              "o1p5pjpqid3w",
              "o6cwq9vgwfg",
              "o1s9tsyhdyyq",
              "ooqnlain5he"
            ],
            "correct": "o1p5pjpqid3w"
          },
          {
            "id": "3",
            "options": [
              "o1sgh6zu1mkd",
              "odg9msqc48",
              "oyi64zhesm",
              "ootzc56cwya"
            ],
            "correct": "o1sgh6zu1mkd"
          },
          {
            "id": "4",
            "options": [
              "o82l8za82z0",
              "o2dv61lyue0l",
              "o1n7ff4msqxj",
              "obpfzrti4rt"
            ],
            "correct": "o82l8za82z0"
          },
          {
            "id": "5",
            "options": [
              "oio7hlhduf4",
              "o1eysaplb4ja",
              "o1uhci5v6q7r",
              "o1ff75dekt0a"
            ],
            "correct": "oio7hlhduf4"
          },
          {
            "id": "6",
            "options": [
              "o1rg427qhzu4",
              "obxxw5xm88",
              "o11lbjbepbfq",
              "o10y0arksr5t"
            ],
            "correct": "o1rg427qhzu4"
          },
          {
            "id": "7",
            "options": [
              "o1uztc7r9rb3",
              "o1880anaz1sy",
              "o1cjkkruugqw",
              "o1429nevakno"
            ],
            "correct": "o1uztc7r9rb3"
          },
          {
            "id": "8",
            "options": [
              "o8t4f74tita",
              "o122vw5ibhub",
              "o2ap0je23y66",
              "ol70ehfp0gs"
            ],
            "correct": "o8t4f74tita"
          }
        ]
      }
    },
    "final": {
      "passingScore": 75,
      "questions": [
        {
          "id": "1",
          "options": [
            "o1uaa5lse9x5",
            "ocagn1wbj6w",
            "o1fz4w5eb89g",
            "o1drq1pdeck3"
          ],
          "correct": "o1uaa5lse9x5"
        },
        {
          "id": "2",
          "options": [
            "o1pc39y2wn7v",
            "o10uzujwyn1e",
            "ovenfha4lqc",
            "o1tqjxcd14aq"
          ],
          "correct": "o1pc39y2wn7v"
        },
        {
          "id": "3",
          "options": [
            "o2232krnm51m",
            "o172jyntxlf8",
            "o1tg6aw3yi2q",
            "oyd71ty61zb"
          ],
          "correct": "o2232krnm51m"
        },
        {
          "id": "4",
          "options": [
            "o2beau1boabk",
            "o1aoa8ik09g8",
            "o1zwhx702yyg",
            "o206c3sgwwyl"
          ],
          "correct": "o2beau1boabk"
        },
        {
          "id": "5",
          "options": [
            "o1b0f8qwtkvy",
            "o29c3czr0faq",
            "o591usm1r64",
            "o2dkn5zjs5p7"
          ],
          "correct": "o1b0f8qwtkvy"
        },
        {
          "id": "6",
          "options": [
            "o1q6ty0xcjcx",
            "o2ghfheio977",
            "ojc7pvcicfh",
            "o4qx7xjr19g"
          ],
          "correct": "o1q6ty0xcjcx"
        },
        {
          "id": "7",
          "options": [
            "o2dck4ychxdt",
            "ozo2kx5c7f5",
            "owizhaicmtx",
            "opcmvucklmx"
          ],
          "correct": "o2dck4ychxdt"
        },
        {
          "id": "8",
          "options": [
            "o9mjimabmtq",
            "o1n5u7r6zii1",
            "ol0iylf3y6z",
            "o1z6ksuh2cp4"
          ],
          "correct": "o9mjimabmtq"
        },
        {
          "id": "9",
          "options": [
            "o132vc1afheo",
            "ofz11fr5c6o",
            "o1ygez1lbz7g",
            "o1z67pkpay9d"
          ],
          "correct": "o132vc1afheo"
        },
        {
          "id": "10",
          "options": [
            "o1cid6qf4jb7",
            "oq32g9ozzuv",
            "o20y7ijiynm5",
            "obazyxhwvwp"
          ],
          "correct": "o1cid6qf4jb7"
        }
      ]
    }
  },
  "crypto_market": {
    "chapters": {
      "1": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "o1yu52f4maa7",
              "o1rhtdgs8c3p",
              "oxw4s8dnalc",
              "o1uu13bo05eg"
            ],
            "correct": "o1yu52f4maa7"
          },
          {
            "id": "2",
            "options": [
              "o1s5nghilfbd",
              "o2b0uzlxbyos",
              "okliytmm9qy",
              "o128p544w7ki"
            ],
            "correct": "o2b0uzlxbyos"
          },
          {
            "id": "3",
            "options": [
              "o1g6kbt6jgkf",
              "o2fpwaosd2my",
              "od41jueitaq",
              "ogiyjip2loo"
            ],
            "correct": "o2fpwaosd2my"
          },
          {
            "id": "4",
            "options": [
              "obi0qjsk622",
              "o1vje7hw84g7",
              "o1tgp9cy38r",
              "o1n548wynfhj"
            ],
            "correct": "obi0qjsk622"
          },
          {
            "id": "5",
            "options": [
              "o2fspqeushqy",
              "oe14jc541ll",
              "o1xynntl2y6v",
              "odh3mjl3smj"
            ],
            "correct": "odh3mjl3smj"
          }
        ]
      },
      "2": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "o2fmmbovefjl",
              "o294idh5gx7x",
              "ob6kiqzubkj",
              "o28j2nhbbs7e"
            ],
            "correct": "o2fmmbovefjl"
          },
          {
            "id": "2",
            "options": [
              "oba58yylkru",
              "o16di1b7i2y8",
              "o100cvfxl55",
              "o288eyfqb8tp"
            ],
            "correct": "oba58yylkru"
          },
          {
            "id": "3",
            "options": [
              "osy1k9axb8r",
              "o1aoyphpw4pf",
              "or8lg9qaqat",
              "o1jjatbbg6cs"
            ],
            "correct": "o1aoyphpw4pf"
          },
          {
            "id": "4",
            "options": [
              "otofhg3m2b",
              "o1upwxuhqikz",
              "o1v5gk2unmv5",
              "o96lc8w1nzr"
            ],
            "correct": "o1upwxuhqikz"
          },
          {
            "id": "5",
            "options": [
              "o28jy4ctrkyl",
              "o1cujm94g4l9",
              "odea03autit",
              "o9lta9le2jg"
            ],
            "correct": "o1cujm94g4l9"
          }
        ]
      },
      "3": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "o13u6of3m",
              "o9cpszf196f",
              "o1x38czog4ge",
              "o1cvq9x9b3ap"
            ],
            "correct": "o9cpszf196f"
          },
          {
            "id": "2",
            "options": [
              "ommjx0i6yw0",
              "o2dbmfz710so",
              "o29qs25rcmge",
              "or441capevs"
            ],
            "correct": "o2dbmfz710so"
          },
          {
            "id": "3",
            "options": [
              "o1yiblad6j7e",
              "ox16945u4sx",
              "o14rez1mkavk",
              "o17q1ml1pik5"
            ],
            "correct": "o1yiblad6j7e"
          },
          {
            "id": "4",
            "options": [
              "o24bvvuksgan",
              "o2fb769n2nd5",
              "ocwk3mzhaui",
              "ov0fu8enw21"
            ],
            "correct": "o24bvvuksgan"
          },
          {
            "id": "5",
            "options": [
              "o1hjiqy0qofq",
              "o1dx76nzljc7",
              "o1on97gnonyw",
              "ojx8wa06lco"
            ],
            "correct": "o1dx76nzljc7"
          }
        ]
      },
      "4": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "o74tvirowem",
              "o24l6rbx22th",
              "oxoz6f1zsc9",
              "o1j8jr3rq8u9"
            ],
            "correct": "o24l6rbx22th"
          },
          {
            "id": "2",
            "options": [
              "o1sms3a2pi2f",
              "o1b5z0aoo8fn",
              "on809egvvor",
              "o8xqu0vp5a3"
            ],
            "correct": "o1b5z0aoo8fn"
          },
          {
            "id": "3",
            "options": [
              "o1648sio7krx",
              "o29atb0d5684",
              "o232e0ulmi4t",
              "ovw611zr97p"
            ],
            "correct": "o232e0ulmi4t"
          },
          {
            "id": "4",
            "options": [
              "otm4vszi9jl",
              "o138l33rju9t",
              "o1e3de44easc",
              "o1rw14ekrfox"
            ],
            "correct": "o138l33rju9t"
          },
          {
            "id": "5",
            "options": [
              "o20sri4tgvni",
              "o5p4zl6dutl",
              "o14vdi6rs3yt",
              "o25ohbhfsnbk"
            ],
            "correct": "o5p4zl6dutl"
          }
        ]
      },
      "5": {
        "passingScore": 75,
        "questions": [
          {
            "id": "1",
            "options": [
              "o2bi8ql876cf",
              "o20o4hw2kp1q",
              "op6m841ool1",
              "okcujvnlvz1"
            ],
            "correct": "o20o4hw2kp1q"
          },
          {
            "id": "2",
            "options": [
              "o1td94zicu04",
              "o1jtbu41c0qj",
              "o17jcnn66xm6",
              "oj9kx3kynt4"
            ],
            "correct": "o1jtbu41c0qj"
          },
          {
            "id": "3",
            "options": [
              "op41lu0oqzz",
              "oeoy1wja5do",
              "o12uavme2dl9",
              "o1i8r84ddpg9"
            ],
            "correct": "oeoy1wja5do"
          },
          {
            "id": "4",
            "options": [
              "o2db1jks15w1",
              "o1pkrf5is8jg",
              "o2bnkp8wljvv",
              "o1vqayg09c4g"
            ],
            "correct": "o1pkrf5is8jg"
          },
          {
            "id": "5",
            "options": [
              "o7t68chgs8g",
              "ohnbtr84o1g",
              "o1iy3p3iarlz",
              "oez9rqkxnrz"
            ],
            "correct": "o7t68chgs8g"
          }
        ]
      }
    },
    "final": {
      "passingScore": 75,
      "questions": [
        {
          "id": "1",
          "options": [
            "o29s3kn7mmpm",
            "o21w8bhgenn7",
            "oejzu29pf9n",
            "o1qzzz0hwxy2"
          ],
          "correct": "o29s3kn7mmpm"
        },
        {
          "id": "2",
          "options": [
            "o29a0qkl8s7d",
            "o1j6fwgvdoty",
            "o1bj5v9c3xqa",
            "o11x5g5qg4my"
          ],
          "correct": "o29a0qkl8s7d"
        },
        {
          "id": "3",
          "options": [
            "o18qr8mguq9f",
            "olw5dqf9xe7",
            "oivjtvdvjh6",
            "o2actfrrgj7s"
          ],
          "correct": "o18qr8mguq9f"
        },
        {
          "id": "4",
          "options": [
            "o8i2g7zv4nl",
            "o275o5qz6pe4",
            "o2fe1vv3y6w8",
            "o1ubpt6lisko"
          ],
          "correct": "o275o5qz6pe4"
        },
        {
          "id": "5",
          "options": [
            "o26aanstaxe1",
            "o1e6b7xlcz7s",
            "o1t9el8qweoo",
            "o2g7a5ruynvw"
          ],
          "correct": "o26aanstaxe1"
        },
        {
          "id": "6",
          "options": [
            "o2674vhvfsq7",
            "olkg3a9mr4d",
            "ooqhhletpa3",
            "o1ftk7kx2tlp"
          ],
          "correct": "ooqhhletpa3"
        },
        {
          "id": "7",
          "options": [
            "o7l2idezrzn",
            "os5r3fzby10",
            "ogko8uqm36z",
            "ouxoymi77x8"
          ],
          "correct": "os5r3fzby10"
        },
        {
          "id": "8",
          "options": [
            "o1szw2wsl9vv",
            "o2cll66kss8z",
            "o2er7rz6y2vb",
            "o10vw306l9h"
          ],
          "correct": "o2cll66kss8z"
        }
      ]
    }
  }
};
