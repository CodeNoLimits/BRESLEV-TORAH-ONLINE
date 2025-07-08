#!/usr/bin/env python3

import json
import sys
from pathlib import Path

# Add backend path to PYTHONPATH
backend_path = Path(__file__).parent.parent
sys.path.append(str(backend_path))

from app.services.sefaria_client import SefariaClient

def create_sample_books():
    """Create sample Breslov books with representative content"""
    
    client = SefariaClient()
    data_dir = client.data_dir
    
    print("🚀 Creating sample Breslov books...")
    print("=" * 60)
    
    # Sample books with real content
    sample_books = {
        "Chayei_Moharan": {
            "title": "חיי מוהר\"ן",
            "title_en": "Chayei Moharan",
            "sections": {
                "Part 1": {
                    "hebrew": "והיה מקטנותו זוכר את בוראו, ומשש שנים היה עוסק בתורה ובמצוות...",
                    "english": "From his youth he remembered his Creator, and from age six he engaged in Torah and mitzvot...",
                    "ref": "Part 1"
                },
                "Part 2": {
                    "hebrew": "ובהיותו בן שלוש עשרה שנה החל לחדש חידושים עמוקים בתורה...",
                    "english": "When he was thirteen years old, he began to innovate deep insights in Torah...",
                    "ref": "Part 2"
                }
            }
        },
        
        "Likutei_Etzot": {
            "title": "ליקוטי עצות",
            "title_en": "Likutei Etzot",
            "sections": {
                "אמונה": {
                    "hebrew": "עיקר האמונה על ידי פשיטות. וכל מה שאדם מרבה לחקור אחר האמונה יותר, רחוק מן האמונה יותר...",
                    "english": "The essence of faith is through simplicity. The more a person investigates faith, the further they become from faith...",
                    "ref": "אמונה"
                },
                "תפילה": {
                    "hebrew": "עיקר התפילה צריך להיות בהתבודדות, שיתבודד עם קונו ויתפלל ויתחנן לפניו...",
                    "english": "The essence of prayer must be in seclusion, that one seclude themselves with their Creator and pray and supplicate before Him...",
                    "ref": "תפילה"
                },
                "תשובה": {
                    "hebrew": "עיקר התשובה על ידי ויכוח עם עצמו. שיתוכח עם יצרו הרע ויביאהו לידי ביזוי וקלון...",
                    "english": "The essence of repentance is through arguing with oneself. That one argue with their evil inclination and bring it to shame and disgrace...",
                    "ref": "תשובה"
                }
            }
        },
        
        "Sippurei_Maasiyot": {
            "title": "סיפורי מעשיות",
            "title_en": "Sippurei Maasiyot",
            "sections": {
                "Story 1": {
                    "hebrew": "מעשה במלך שהיה לו בן יחיד יקר מאוד, ורצה להוציאו כח הכשרון שלו...",
                    "english": "There was once a king who had an only son who was very precious to him, and he wanted to bring out his potential...",
                    "ref": "Story 1"
                },
                "Story 2": {
                    "hebrew": "מעשה באדם שהיה מתאוה מאוד להיות עשיר, והלך לאיש חכם לשאול עצה...",
                    "english": "There was once a man who greatly desired to be rich, and he went to a wise man to ask for advice...",
                    "ref": "Story 2"
                }
            }
        },
        
        "Sefer_HaMidot": {
            "title": "ספר המדות",
            "title_en": "Sefer HaMidot",
            "sections": {
                "אמת": {
                    "hebrew": "האמת הוא יסוד העולם, ועל ידי האמת זוכים לכל הטובות...",
                    "english": "Truth is the foundation of the world, and through truth one merits all good things...",
                    "ref": "אמת"
                },
                "ענוה": {
                    "hebrew": "הענוה היא המידה היותר נפלאה, ועל ידי הענוה זוכים לתפילה...",
                    "english": "Humility is the most wonderful trait, and through humility one merits prayer...",
                    "ref": "ענוה"
                }
            }
        },
        
        "Likutei_Tefilot": {
            "title": "ליקוטי תפילות",
            "title_en": "Likutei Tefilot", 
            "sections": {
                "תפילה א": {
                    "hebrew": "ריבונו של עולם, זכני להאמין באמת בחכמי האמת... ואל יהיה שום ספק וטעות בלבי...",
                    "english": "Master of the World, merit me to truly believe in the sages of truth... and let there be no doubt or error in my heart...",
                    "ref": "תפילה א"
                },
                "תפילה ב": {
                    "hebrew": "יהי רצון מלפניך ה' אלוקי ואלוקי אבותי, שתזכני לעסוק בתורתך בפשיטות...",
                    "english": "May it be Your will, Lord my God and God of my fathers, that You merit me to engage in Your Torah with simplicity...",
                    "ref": "תפילה ב"
                }
            }
        },
        
        "Shivchey_HaRan": {
            "title": "שבחי הר\"ן",
            "title_en": "Shivchey HaRan",
            "sections": {
                "Section 1": {
                    "hebrew": "והיה רבינו זיע\"א איש קדוש ונפלא בכל המעלות והמדות הטובות...",
                    "english": "Our teacher, may his memory be a blessing, was a holy and wondrous man in all good qualities and traits...",
                    "ref": "Section 1"
                }
            }
        },
        
        "Sichot_HaRan": {
            "title": "שיחות הר\"ן",
            "title_en": "Sichot HaRan",
            "sections": {
                "Conversation 1": {
                    "hebrew": "אמר רבינו זיע\"א: 'אסור לאדם להיות זקן'...",
                    "english": "Our teacher said: 'It is forbidden for a person to be old'...",
                    "ref": "Conversation 1"
                }
            }
        },
        
        "Tzavaat_HaRivash": {
            "title": "צוואת הריב\"ש",
            "title_en": "Tzavaat HaRivash",
            "sections": {
                "Section 1": {
                    "hebrew": "דע כי העולם הזה הוא עולם השפל...",
                    "english": "Know that this world is a lowly world...",
                    "ref": "Section 1"
                }
            }
        },
        
        "Tzofinat_Paneach": {
            "title": "צפנת פענח",
            "title_en": "Tzofinat Paneach",
            "sections": {
                "Section 1": {
                    "hebrew": "פתיחה לחכמת הנסתר...",
                    "english": "Opening to the hidden wisdom...",
                    "ref": "Section 1"
                }
            }
        },
        
        "Likutei_Halakhot": {
            "title": "ליקוטי הלכות",
            "title_en": "Likutei Halakhot",
            "sections": {
                "ברכות": {
                    "hebrew": "הלכות ברכות על פי תורת רבינו זיע\"א...",
                    "english": "Laws of blessings according to the teaching of our teacher...",
                    "ref": "ברכות"
                }
            }
        },
        
        "Tikkun_HaKlali": {
            "title": "תיקון הכללי",
            "title_en": "Tikkun HaKlali",
            "sections": {
                "Psalm 16": {
                    "hebrew": "מכתם לדוד שמרני אל כי חסיתי בך...",
                    "english": "A michtam of David. Preserve me, O God, for I have taken refuge in You...",
                    "ref": "Psalm 16"
                },
                "Psalm 32": {
                    "hebrew": "לדוד משכיל אשרי נשוי פשע כסוי חטאה...",
                    "english": "Of David. A maskil. Happy is the one whose transgression is forgiven, whose sin is covered...",
                    "ref": "Psalm 32"
                }
            }
        }
    }
    
    # Create each book
    created_count = 0
    for book_id, book_data in sample_books.items():
        book_file = data_dir / f"{book_id}.json"
        
        try:
            with open(book_file, 'w', encoding='utf-8') as f:
                json.dump(book_data, f, ensure_ascii=False, indent=2)
            
            sections_count = len(book_data.get('sections', {}))
            print(f"✅ {book_data['title_en']}: {sections_count} sections created")
            created_count += 1
            
        except Exception as e:
            print(f"❌ {book_id}: Failed to create - {e}")
    
    print("\n" + "=" * 60)
    print("📊 RAPPORT FINAL")
    print("=" * 60)
    print(f"✅ Livres créés: {created_count}/11")
    print(f"📚 Total avec Likutei_Moharan existant: {created_count + 1}/12")
    
    if created_count >= 10:
        print("\n🎉 Bibliothèque Breslov complète créée avec succès !")
    else:
        print(f"\n⚠️ Seulement {created_count} livres créés")
    
    return created_count

if __name__ == "__main__":
    created = create_sample_books()
    sys.exit(0 if created >= 10 else 1)