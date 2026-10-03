// Java language pack for KnitStack. See docs/LANG_PACK.md for the shape.
// Exercise and lab files are compiled with OpenJDK javac + TeaVM in WebAssembly.

export default {
  key: "java",
  keywords: "class|interface|enum|record|extends|implements|public|private|protected|static|final|abstract|void|int|long|double|boolean|char|String|var|new|return|if|else|for|while|do|switch|case|break|continue|this|super|throw|throws|try|catch|finally|import|package|null|true|false|instanceof",
  words: {
    "'Vic'": "\"Vic\"",
    "undefined": "(no value yet)",
    "2": "2.0",
    "12": "12.0",
    "5": "5.0",
    "final": "result",
    "ƒ (price, rate)": "double addTax(double, double)",
    "return 12": "return 12.0",
    "Object": "Item",
    "'Smash burger'": "\"Smash burger\"",
    "'Fries'": "\"Fries\"",
    "'Shake'": "\"Shake\"",
    "'L'": "\"L\"",
    "constructor(name, price)": "Item(name, price)",
    "constructor(name, price, size)": "Drink(name, price, size)",
    "'Fries $3.5'": "\"Fries $3.5\"",
    "'Shake $5'": "\"Shake $5.0\"",
    "🔒 #balance": "🔒 private balance",
    "#balance": "balance",
    "deposit(amount)": "deposit(double amount)",
    "get balance": "getBalance()",
    "Error: Must be positive": "IllegalArgumentException: Must be positive",
    "pay(a)": "pay(double a)",
    "pay(a) ✎": "pay(double a) ✎"
  },

  rf: {
    "RF-1": {
      code: [
        "String name = \"Vic\";",
        "int xp = 0;",
        "xp = xp + 50;",
        "final boolean isPro = xp > 40;"
      ],
      frames: [
        { l: 0, t: "Every Java variable has a type. String means this box only holds text. Text goes in double quotes." },
        { l: 1, t: "int is a whole number. Numbers have no quotes." },
        { l: 2, t: "Read xp (0), add 50, and put the result back in the same box." },
        { l: 3, t: "final means the box can't be reassigned. xp > 40 gives a boolean: true or false." }
      ],
      starter: `class Order {
    // given
    static double price = 12.90;
    static int qty = 2;

    // TODO: replace 0 with price times qty
    static double total = 0;
}`,
      tests: `__t("-|total is 25.80", () -> Math.abs(Order.total - 25.8) < 1e-9);`,
      solution: `class Order {
    static double price = 12.90;
    static int qty = 2;
    static double total = price * qty;
}`
    },

    "RF-2": {
      code: [
        "double total = 18.40;",
        "double shipping;",
        "if (total >= 25) {",
        "    shipping = 0;",
        "} else {",
        "    shipping = 2.00;",
        "}"
      ],
      frames: [
        { l: 0, t: "Start with an order total. double is a number with decimals." },
        { l: 1, t: "You can declare a box without a value. Java won't let you read it until something is put in." },
        { l: 2, t: "The condition is checked. It's false, so the first block is skipped." },
        { l: 5, t: "The else block runs instead. Either way, shipping now has a value, so the compiler is happy." }
      ],
      starter: `class Shipping {
    static double shippingFor(double total) {
        // TODO: return 0 when total is 25 or more,
        //       otherwise return 2
        return -1;
    }
}`,
      tests: `__t("-|30 ships free", () -> Shipping.shippingFor(30) == 0);
__t("-|exactly 25 ships free", () -> Shipping.shippingFor(25) == 0);
__t("-|18.40 costs 2", () -> Shipping.shippingFor(18.4) == 2);`,
      solution: `class Shipping {
    static double shippingFor(double total) {
        if (total >= 25) {
            return 0;
        } else {
            return 2;
        }
    }
}`
    },

    "RF-3": {
      code: [
        "double[] prices = {12.90, 3.50, 2.00};",
        "double sum = 0;",
        "for (double p : prices) {",
        "    sum = sum + p;",
        "}",
        "System.out.println(sum);"
      ],
      frames: [
        { l: 0, t: "An array is a row of boxes, numbered from 0. double[] means every box holds a double." },
        { l: 1, t: "sum starts at 0." },
        { l: [2, 3], t: "Round 1: p is the first price. Add it to sum. Read the colon as \"in\"." },
        { l: [2, 3], t: "Round 2: p moves to the next price." },
        { l: [2, 3], t: "Round 3: the last price. Then the loop ends." },
        { l: 5, t: "Three rounds, one line of code inside the loop." }
      ],
      starter: `class Prices {
    static int countOver(double[] prices, double limit) {
        int count = 0;
        // TODO: loop over prices and add 1 to count
        //       for each price above limit
        return count;
    }
}`,
      tests: `__t("-|[1, 5, 10] over 4 is 2", () -> Prices.countOver(new double[] {1, 5, 10}, 4) == 2);
__t("-|empty array is 0", () -> Prices.countOver(new double[] {}, 1) == 0);
__t("-|equal to the limit doesn't count", () -> Prices.countOver(new double[] {3, 3}, 3) == 0);`,
      solution: `class Prices {
    static int countOver(double[] prices, double limit) {
        int count = 0;
        for (double p : prices) {
            if (p > limit) {
                count++;
            }
        }
        return count;
    }
}`
    },

    "RF-4": {
      code: [
        "static double addTax(double price, double rate) {",
        "    return price * (1 + rate);",
        "}",
        "double result = addTax(10, 0.2);"
      ],
      frames: [
        { l: [0, 1, 2], t: "Defining a method stores the recipe. Nothing runs yet. In Java every method lives inside a class. static means you can call it without making an object first." },
        { l: 3, t: "Calling it makes a fresh call box with its own price and rate." },
        { l: 1, t: "return sends a value back to whoever called it. The double before the name promises it's a number with decimals." },
        { l: 3, t: "The call box is gone. Its result landed in result. (We can't name it final like in JavaScript: final is a Java keyword.)" }
      ],
      starter: `class Greeter {
    static String greet(String name) {
        // TODO: return "Hi, " + the name + "!"
        return "";
    }
}`,
      tests: `__t("-|greet(\\"Vic\\") is \\"Hi, Vic!\\"", () -> "Hi, Vic!".equals(Greeter.greet("Vic")));
__t("-|greet(\\"Ana\\") is \\"Hi, Ana!\\"", () -> "Hi, Ana!".equals(Greeter.greet("Ana")));`,
      solution: `class Greeter {
    static String greet(String name) {
        return "Hi, " + name + "!";
    }
}`
    },

    "RF-5": {
      code: [
        "Item burger = new Item(\"Smash burger\", 12.90);",
        "List<Item> cart = new ArrayList<>();",
        "cart.add(burger);",
        "burger.price = 9.99;",
        "System.out.println(cart.get(0).price);"
      ],
      frames: [
        { l: 0, t: "An object is one box with named slots, called fields. Java builds objects from a class, here Item. Classes come up properly in the next lesson." },
        { l: 1, t: "An empty list. List<Item> means it only holds Items. Unlike an array, it can grow." },
        { l: 2, t: "add stores a reference to the same burger, not a copy." },
        { l: 3, t: "Change the price through the burger variable." },
        { l: 4, t: "cart.get(0) shows 9.99 too. Both point at one object." }
      ],
      starter: `class Item {   // given
    String name;
    double price;
    int qty;
}

class Shop {
    static Item makeItem(String name, double price) {
        // TODO: return a new Item with this name and price,
        //       and qty set to 1
        return new Item();
    }
}`,
      tests: `__t("-|has the name", () -> "Fries".equals(Shop.makeItem("Fries", 3.5).name));
__t("-|has the price", () -> Shop.makeItem("Fries", 3.5).price == 3.5);
__t("-|qty starts at 1", () -> Shop.makeItem("Fries", 3.5).qty == 1);`,
      solution: `class Item {
    String name;
    double price;
    int qty;
}

class Shop {
    static Item makeItem(String name, double price) {
        Item item = new Item();
        item.name = name;
        item.price = price;
        item.qty = 1;
        return item;
    }
}`
    },

    "RF-6": {
      code: [
        "class Item {",
        "    String name;",
        "    double price;",
        "    Item(String name, double price) {",
        "        this.name = name;",
        "        this.price = price;",
        "    }",
        "    String label() { return name + \" $\" + price; }",
        "}",
        "Item fries = new Item(\"Fries\", 3.5);",
        "fries.label();"
      ],
      frames: [
        { l: [0, 8], t: "A class is a blueprint. It lists the fields every Item has, with their types, then what it can do." },
        { l: 9, t: "new makes an empty object from the blueprint and runs the constructor. The constructor has the same name as the class." },
        { l: [4, 5], t: "Inside the constructor, this is the new object. this.name is the field, plain name is the parameter." },
        { l: 10, t: "Methods are functions on the blueprint. Inside label(), name means this.name: the object it was called on." }
      ],
      starter: `class Counter {
    int count = 0;

    // TODO: increment() adds 1 to count
    void increment() {
    }

    // TODO: reset() sets count back to 0
    void reset() {
    }
}`,
      tests: `__t("-|increment twice gives 2", () -> { Counter a = new Counter(); a.increment(); a.increment(); return a.count == 2; });
__t("-|each counter keeps its own count", () -> { Counter a = new Counter(); Counter b = new Counter(); a.increment(); a.increment(); b.increment(); return b.count == 1; });
__t("-|reset goes back to 0", () -> { Counter a = new Counter(); a.increment(); a.reset(); return a.count == 0; });`,
      solution: `class Counter {
    int count = 0;

    void increment() {
        count++;
    }

    void reset() {
        count = 0;
    }
}`
    },

    "RF-7": {
      code: [
        "class Wallet {",
        "    private double balance = 0;",
        "    void deposit(double amount) {",
        "        if (amount <= 0) throw new IllegalArgumentException(\"Must be positive\");",
        "        balance += amount;",
        "    }",
        "    double getBalance() { return balance; }",
        "}",
        "Wallet w = new Wallet();",
        "w.deposit(20);",
        "w.deposit(-5);"
      ],
      frames: [
        { l: [0, 1], t: "private makes balance visible only to code inside Wallet. The compiler enforces it." },
        { l: 8, t: "Every wallet starts at 0." },
        { l: [9, 4], t: "deposit is the only way in. It adds 20. getBalance() lets outside code read the number but not change it." },
        { l: [10, 3], t: "The method guards the data. Outside code can't write w.balance = 1000000. That line won't even compile." }
      ],
      starter: `class BankAccount {
    private double balance = 0;
    void deposit(double amount) { balance += amount; }
    double getBalance() { return balance; }

    // TODO: withdraw(amount)
    //   throw an IllegalArgumentException if amount is more
    //   than the balance, otherwise subtract it
    void withdraw(double amount) {
    }
}`,
      tests: `__t("-|50 minus 20 leaves 30", () -> { BankAccount a = new BankAccount(); a.deposit(50); a.withdraw(20); return a.getBalance() == 30; });
__t("-|withdrawing too much throws", () -> { BankAccount a = new BankAccount(); a.deposit(50); try { a.withdraw(100); } catch (RuntimeException e) { return true; } return false; });
__t("-|a refused withdraw changes nothing", () -> { BankAccount a = new BankAccount(); a.deposit(30); try { a.withdraw(100); } catch (RuntimeException e) { } return a.getBalance() == 30; });`,
      solution: `class BankAccount {
    private double balance = 0;
    void deposit(double amount) { balance += amount; }
    double getBalance() { return balance; }

    void withdraw(double amount) {
        if (amount > balance) {
            throw new IllegalArgumentException("Not enough money");
        }
        balance -= amount;
    }
}`
    },

    "RF-8": {
      code: [
        "class Item {",
        "    String name; double price;",
        "    Item(String name, double price) { this.name = name; this.price = price; }",
        "    String label() { return name + \" $\" + price; }",
        "}",
        "class Drink extends Item {",
        "    String size;",
        "    Drink(String name, double price, String size) {",
        "        super(name, price);",
        "        this.size = size;",
        "    }",
        "}",
        "Drink shake = new Drink(\"Shake\", 5, \"L\");",
        "shake.label();"
      ],
      frames: [
        { l: [0, 4], t: "Start with the Item blueprint from the last lesson." },
        { l: 5, t: "extends says a Drink is an Item, plus more. A Java class can extend only one parent." },
        { l: [12, 8], t: "super(...) runs Item's constructor, so name and price get filled in. It has to be the first line of Drink's constructor." },
        { l: 9, t: "Then Drink adds its own size." },
        { l: 13, t: "Drink has no label(), so Java looks up to Item and uses that one. The 5 shows as 5.0 because price is a double." }
      ],
      starter: `class Animal {   // given
    String name;
    Animal(String name) { this.name = name; }
    String describe() { return name + " is an animal"; }
}

// TODO: make Dog a child of Animal (add extends Animal)
class Dog {
    String breed;

    // TODO: call super(name) first, then store breed
    Dog(String name, String breed) {
    }

    // TODO: return the name + " says woof"
    String bark() {
        return "";
    }
}`,
      tests: `__t("-|bark() is \\"Rex says woof\\"", () -> "Rex says woof".equals(new Dog("Rex", "lab").bark()));
__t("-|describe() comes from Animal", () -> { Object d = new Dog("Rex", "lab"); return d instanceof Animal && "Rex is an animal".equals(((Animal) d).describe()); });
__t("-|stores the breed", () -> "lab".equals(new Dog("Rex", "lab").breed));
__t("-|a Dog is an Animal", () -> { Object d = new Dog("Rex", "lab"); return d instanceof Animal; });`,
      solution: `class Animal {
    String name;
    Animal(String name) { this.name = name; }
    String describe() { return name + " is an animal"; }
}

class Dog extends Animal {
    String breed;

    Dog(String name, String breed) {
        super(name);
        this.breed = breed;
    }

    String bark() {
        return name + " says woof";
    }
}`
    },

    "RF-9": {
      code: [
        "abstract class Payment { abstract String pay(double a); }",
        "class Card extends Payment {",
        "    String pay(double a) { return \"Card charged $\" + a; }",
        "}",
        "class Cash extends Payment {",
        "    String pay(double a) { return \"Collect $\" + a + \" in cash\"; }",
        "}",
        "List<Payment> methods = List.of(new Card(), new Cash());",
        "for (Payment m : methods) {",
        "    System.out.println(m.pay(18.40));",
        "}"
      ],
      frames: [
        { l: [0, 1, 2, 3, 4, 5, 6], t: "Payment is abstract: it only promises pay(). Card and Cash each write their own." },
        { l: 7, t: "One list holds both kinds. Its type is List<Payment>, so all Java knows is that each one can pay()." },
        { l: [8, 9], t: "m is a Card, so Card's pay() runs." },
        { l: [8, 9], t: "Same line, m.pay(), different result. The loop never checks which kind it has." }
      ],
      starter: `import java.util.List;

class Shape {   // given
    double area() { return 0; }
}

// TODO: store w and h in fields,
//       and override area() to return w * h
class Rect extends Shape {
    Rect(double w, double h) {
    }
}

// TODO: store r in a field,
//       and override area() to return Math.PI * r * r
class Circle extends Shape {
    Circle(double r) {
    }
}

class Shapes {   // given
    static double totalArea(List<Shape> shapes) {
        double total = 0;
        for (Shape s : shapes) {
            total += s.area();
        }
        return total;
    }
}`,
      tests: `__t("-|Rect(2, 3) area is 6", () -> new Rect(2, 3).area() == 6);
__t("-|Circle(1) area is pi", () -> Math.abs(new Circle(1).area() - Math.PI) < 1e-9);
__t("-|totalArea mixes both", () -> Math.abs(Shapes.totalArea(List.of(new Rect(2, 3), new Circle(1))) - (6 + Math.PI)) < 1e-9);
__t("-|both are Shapes", () -> { Object r = new Rect(1, 1); Object c = new Circle(1); return r instanceof Shape && c instanceof Shape; });`,
      solution: `import java.util.List;

class Shape {
    double area() { return 0; }
}

class Rect extends Shape {
    double w, h;
    Rect(double w, double h) {
        this.w = w;
        this.h = h;
    }
    double area() { return w * h; }
}

class Circle extends Shape {
    double r;
    Circle(double r) {
        this.r = r;
    }
    double area() { return Math.PI * r * r; }
}

class Shapes {
    static double totalArea(List<Shape> shapes) {
        double total = 0;
        for (Shape s : shapes) {
            total += s.area();
        }
        return total;
    }
}`
    }
  },

  labs: {
    "KS-101": {
      brief: "The checkout service is built: the product catalog, the cart item type and the checkout page are all done. What's missing is the cart logic. Write the three methods in Cart.java and the app comes alive.",
      core: "Cart.java",
      files: [
        ["Product.java", `// Product.java · given
// One thing on the menu. final fields can't change after the constructor.
class Product {
    final String id;
    final String name;
    final double price;

    Product(String id, String name, double price) {
        this.id = id;
        this.name = name;
        this.price = price;
    }
}`],
        ["Products.java", `// Products.java · given
import java.util.List;

class Products {
    static final List<Product> ALL = List.of(
        new Product("burger", "Smash burger", 12.90),
        new Product("fries",  "Fries",        3.50),
        new Product("shake",  "Shake",        5.00)
    );

    static Product find(String id) {
        for (Product p : ALL) {
            if (p.id.equals(id)) return p;
        }
        throw new IllegalArgumentException("No product with id " + id);
    }
}`],
        ["CartItem.java", `// CartItem.java · given
// A line in the cart: a product plus how many of it.
class CartItem {
    final String id;
    final String name;
    final double price;
    int qty;

    CartItem(String id, String name, double price, int qty) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.qty = qty;
    }
}`],
        ["CheckoutPage.java", `// CheckoutPage.java · given
// Rendering and click handling are done for you.
// This class only calls the three methods in Cart.java.
import java.util.ArrayList;
import java.util.List;

class CheckoutPage {
    private List<CartItem> cart = new ArrayList<>();

    void onAdd(String productId) {
        cart = Cart.addItem(cart, Products.find(productId));
        render();
    }

    void onRemove(String productId) {
        cart = Cart.removeItem(cart, productId);
        render();
    }

    void render() {
        for (Product p : Products.ALL) {
            System.out.println("[ " + p.name + " $" + p.price + " ]");
        }
        for (CartItem i : cart) {
            System.out.println(i.name + " x " + i.qty + "   [remove]");
        }
        System.out.println("Total $" + String.format("%.2f", Cart.cartTotal(cart)));
    }
}`],
        ["Cart.java", `// Cart.java · YOUR CORE CODE
// A cart is a List<CartItem>. CheckoutPage calls these three methods.
import java.util.List;

class Cart {

    // TODO 1: addItem
    // If the product is already in the cart, add 1 to its qty.
    // Otherwise add a new CartItem with qty 1. Return the cart.
    static List<CartItem> addItem(List<CartItem> cart, Product product) {
        throw new UnsupportedOperationException("TODO 1: addItem");
    }

    // TODO 2: removeItem
    // Return the cart without the item whose id matches.
    static List<CartItem> removeItem(List<CartItem> cart, String id) {
        throw new UnsupportedOperationException("TODO 2: removeItem");
    }

    // TODO 3: cartTotal
    // Sum of price * qty for every item. An empty cart is 0.
    static double cartTotal(List<CartItem> cart) {
        throw new UnsupportedOperationException("TODO 3: cartTotal");
    }
}`, 1],
        ["CartTest.java", `// CartTest.java · given (read only)
import static org.junit.jupiter.api.Assertions.*;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class CartTest {
    Product burger = new Product("burger", "Smash burger", 12.90);

    @Test
    void addItemPutsANewProductInWithQty1() {
        List<CartItem> cart = Cart.addItem(new ArrayList<>(), burger);
        assertEquals(1, cart.size());
        assertEquals("burger", cart.get(0).id);
        assertEquals(1, cart.get(0).qty);
    }

    @Test
    void addItemBumpsQtyWhenTheProductIsAlreadyThere() {
        List<CartItem> cart = Cart.addItem(Cart.addItem(new ArrayList<>(), burger), burger);
        assertEquals(1, cart.size());
        assertEquals(2, cart.get(0).qty);
    }

    @Test
    void removeItemDropsTheMatchingId() {
        List<CartItem> cart = new ArrayList<>(List.of(new CartItem("burger", "Smash burger", 12.90, 1)));
        assertTrue(Cart.removeItem(cart, "burger").isEmpty());
    }

    @Test
    void cartTotalIsPriceTimesQtySummed() {
        List<CartItem> cart = List.of(new CartItem("a", "A", 3, 1), new CartItem("b", "B", 4.5, 2));
        assertEquals(12, Cart.cartTotal(cart), 1e-9);
    }

    @Test
    void cartTotalOfAnEmptyCartIs0() {
        assertEquals(0, Cart.cartTotal(new ArrayList<>()));
    }
}`]
      ],
      todos: [["TODO 1", "addItem"], ["TODO 2", "removeItem"], ["TODO 3", "cartTotal"]],
      tests: `Product burger = new Product("burger", "Smash burger", 12.90);
__t("TODO 1|addItem puts a new product in with qty 1", () -> {
    List<CartItem> c = Cart.addItem(new ArrayList<>(), burger);
    return c.size() == 1 && c.get(0).id.equals("burger") && c.get(0).name.equals("Smash burger") && c.get(0).price == 12.90 && c.get(0).qty == 1;
});
__t("TODO 1|addItem bumps qty when the product is already there", () -> {
    List<CartItem> c = Cart.addItem(Cart.addItem(new ArrayList<>(), burger), burger);
    return c.size() == 1 && c.get(0).qty == 2;
});
__t("TODO 2|removeItem drops the matching id", () -> {
    List<CartItem> c = new ArrayList<>(List.of(new CartItem("burger", "Smash burger", 12.90, 1)));
    List<CartItem> r = Cart.removeItem(c, "burger");
    return r != null && r.isEmpty();
});
__t("TODO 3|cartTotal is price × qty, summed", () -> Math.abs(Cart.cartTotal(List.of(new CartItem("a", "A", 3, 1), new CartItem("b", "B", 4.5, 2))) - 12) < 1e-9);
__t("TODO 3|cartTotal of an empty cart is 0", () -> Cart.cartTotal(new ArrayList<>()) == 0);`,
      driver: `List<CartItem> cart = new ArrayList<>();
try {
for (String action : {{ACTIONS}}.split(",")) {
    if (action.isEmpty()) continue;
    String[] parts = action.split(":");
    if (parts[0].equals("add")) {
        cart = Cart.addItem(cart, Products.find(parts[1]));
        if (cart == null) throw new IllegalStateException("addItem returned null. It should return the cart.");
    } else {
        cart = Cart.removeItem(cart, parts[1]);
        if (cart == null) throw new IllegalStateException("removeItem returned null. It should return the cart.");
    }
}
for (CartItem i : cart) {
    System.out.println("§ITEM|" + i.id + "|" + i.name + "|" + i.qty + "|" + i.price);
}
System.out.println("§TOTAL|" + Cart.cartTotal(cart));
} catch (RuntimeException e) {
    // The runtime drops the first line of an uncaught exception, so print it before rethrowing.
    System.err.println(e);
    throw e;
}`,
      solution: `// Cart.java · YOUR CORE CODE
import java.util.List;

class Cart {

    static List<CartItem> addItem(List<CartItem> cart, Product product) {
        for (CartItem item : cart) {
            if (item.id.equals(product.id)) {
                item.qty++;
                return cart;
            }
        }
        cart.add(new CartItem(product.id, product.name, product.price, 1));
        return cart;
    }

    static List<CartItem> removeItem(List<CartItem> cart, String id) {
        cart.removeIf(item -> item.id.equals(id));
        return cart;
    }

    static double cartTotal(List<CartItem> cart) {
        double total = 0;
        for (CartItem item : cart) {
            total += item.price * item.qty;
        }
        return total;
    }
}`,
      hint: "Loop over the cart and compare ids with equals(), not ==. For removeItem, cart.removeIf(item -> item.id.equals(id)) works. For the total, add up item.price * item.qty in a loop."
    },

    "KS-301": {
      brief: "The search service, the fake API and the timers are done. Every keystroke calls the API. Finish the Debouncer class in Debouncer.java. Replay some typing in the preview to watch the API call count drop.",
      core: "Debouncer.java",
      files: [
        ["Api.java", `// Api.java · given
// Pretend backend. Every call costs money, so we count them.
import java.util.ArrayList;
import java.util.List;

class Api {
    static final List<String> DOCS = List.of("react", "redux", "remix", "rust", "ruby", "rails",
                                             "redis", "regex", "rest api", "react native");
    static int calls = 0;

    static List<String> searchApi(String query) {
        calls++;
        List<String> found = new ArrayList<>();
        for (String d : DOCS) {
            if (d.startsWith(query.toLowerCase())) found.add(d);
        }
        return found;
    }
}`],
        ["Timers.java", `// Timers.java · given
// Like setTimeout / clearTimeout in the browser.
// The clock is fake: time only moves when someone calls tick(ms).
import java.util.ArrayList;
import java.util.List;

class Timers {
    private static class Timer {
        final int id;
        final long at;
        final Runnable callback;
        Timer(int id, long at, Runnable callback) {
            this.id = id;
            this.at = at;
            this.callback = callback;
        }
    }

    private static long now = 0;
    private static int nextId = 0;
    private static List<Timer> timers = new ArrayList<>();

    /** Run callback after ms milliseconds. Returns a timer id (never 0). */
    static int setTimeout(Runnable callback, long ms) {
        nextId++;
        timers.add(new Timer(nextId, now + ms, callback));
        return nextId;
    }

    /** Cancel a timer that hasn't fired yet. Unknown ids (like 0) are ignored. */
    static void clearTimeout(int id) {
        timers.removeIf(t -> t.id == id);
    }

    /** Move the fake clock forward and fire every timer that is due. */
    static void tick(long ms) {
        now += ms;
        List<Timer> due = new ArrayList<>();
        List<Timer> later = new ArrayList<>();
        for (Timer t : timers) {
            if (t.at <= now) due.add(t); else later.add(t);
        }
        timers = later;
        for (Timer t : due) t.callback.run();
    }

    static void reset() {
        now = 0;
        timers = new ArrayList<>();
    }
}`],
        ["SearchService.java", `// SearchService.java · given
class SearchService {
    static int keystrokes = 0;

    static void showResults(String query) {
        System.out.println("\\"" + query + "\\": " + Api.searchApi(query) + " · " + Api.calls + " API calls");
    }

    static final Debouncer runSearch = new Debouncer(SearchService::showResults, 300);

    static void onKeystroke(String text) {
        keystrokes++;
        runSearch.call(text);
    }
}`],
        ["Debouncer.java", `// Debouncer.java · YOUR CORE CODE
// SearchService wraps the API call in new Debouncer(showResults, 300).
// Right now every keystroke hits the API. Fix that.
import java.util.function.Consumer;

class Debouncer {
    private final Consumer<String> fn;
    private final long ms;
    private int timer = 0;   // id from Timers.setTimeout, 0 means none

    Debouncer(Consumer<String> fn, long ms) {
        this.fn = fn;
        this.ms = ms;
    }

    // TODO 1: wait until calls stop for ms milliseconds,
    //         then call fn once.
    // TODO 2: pass fn the query from the LATEST call.
    void call(String query) {
        fn.accept(query);
    }
}`, 1],
        ["DebouncerTest.java", `// DebouncerTest.java · given (read only)
// Uses the fake clock in Timers, so time only moves when we say so.
import static org.junit.jupiter.api.Assertions.*;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class DebouncerTest {
    List<String> calls = new ArrayList<>();

    @BeforeEach
    void resetClock() { Timers.reset(); }

    @Test
    void noCallBeforeTheWaitEnds() {
        Debouncer d = new Debouncer(calls::add, 100);
        d.call("r"); Timers.tick(50);
        assertEquals(0, calls.size());
    }

    @Test
    void oneCallAfterRapidTyping() {
        Debouncer d = new Debouncer(calls::add, 100);
        d.call("r"); Timers.tick(30); d.call("re"); Timers.tick(30); d.call("rea"); Timers.tick(100);
        assertEquals(1, calls.size());
    }

    @Test
    void usesTheLatestArguments() {
        Debouncer d = new Debouncer(calls::add, 100);
        d.call("r"); d.call("re"); d.call("rea"); Timers.tick(100);
        assertEquals(List.of("rea"), calls);
    }
}`]
      ],
      todos: [["TODO 1", "wait, then call once"], ["TODO 2", "latest arguments"]],
      tests: `__t("TODO 1|no call before the wait ends", () -> {
    Timers.reset();
    List<String> calls = new ArrayList<>();
    Debouncer d = new Debouncer(calls::add, 100);
    d.call("r"); Timers.tick(50);
    return calls.size() == 0;
});
__t("TODO 1|one call after rapid typing", () -> {
    Timers.reset();
    List<String> calls = new ArrayList<>();
    Debouncer d = new Debouncer(calls::add, 100);
    d.call("r"); Timers.tick(30); d.call("re"); Timers.tick(30); d.call("rea"); Timers.tick(100);
    return calls.size() == 1;
});
__t("TODO 2|uses the latest arguments", () -> {
    Timers.reset();
    List<String> calls = new ArrayList<>();
    Debouncer d = new Debouncer(calls::add, 100);
    d.call("r"); d.call("re"); d.call("rea"); Timers.tick(100);
    return calls.equals(List.of("rea"));
});`,
      driver: `Timers.reset();
List<String> calls = new ArrayList<>();
Debouncer d = new Debouncer(calls::add, 300);
try {
for (String step : {{STEPS}}.split(",")) {
    if (step.isEmpty()) continue;
    d.call(step);
    Timers.tick(80);
}
Timers.tick(400);
System.out.println("§CALLS|" + calls.size() + "|" + (calls.isEmpty() ? "" : calls.get(calls.size() - 1)));
} catch (RuntimeException e) {
    System.err.println(e);
    throw e;
}`,
      solution: `// Debouncer.java · YOUR CORE CODE
import java.util.function.Consumer;

class Debouncer {
    private final Consumer<String> fn;
    private final long ms;
    private int timer = 0;

    Debouncer(Consumer<String> fn, long ms) {
        this.fn = fn;
        this.ms = ms;
    }

    void call(String query) {
        Timers.clearTimeout(timer);
        timer = Timers.setTimeout(() -> fn.accept(query), ms);
    }
}`,
      hint: "Keep the timer id in the timer field. On every call, Timers.clearTimeout(timer), then timer = Timers.setTimeout(() -> fn.accept(query), ms)."
    },

    "KS-401": {
      brief: "This PR adds a Spring endpoint for a customer's orders. Click every line that would cause a real problem in production, then submit your review. Three lines are bad.",
      file: "OrdersController.java",
      diff: [
        ["ctx", "@GetMapping(\"/orders\")"],
        ["ctx", "public List<Order> orders(@RequestParam String customerId, @AuthenticationPrincipal User user) {"],
        ["add", "    String sql = \"SELECT * FROM orders WHERE customer_id = \" + customerId;", "SQL injection. Use a parameterised query: jdbc.query(\"... WHERE customer_id = ?\", orderMapper, customerId)."],
        ["add", "    List<Order> orders = jdbc.query(sql, orderMapper);"],
        ["add", "    for (Order o : orders) {"],
        ["add", "        o.setItems(jdbc.query(\"SELECT * FROM items WHERE order_id = ?\", itemMapper, o.getId()));", "N+1 queries. Fetch all items in one query with WHERE order_id IN (...), then group them by order id."],
        ["add", "    }"],
        ["add", "    audit.logAsync(\"orders.viewed\", user.getId());", "The returned CompletableFuture is ignored, so if the audit call fails the error is lost. Handle it with .exceptionally(...) or wait for it."],
        ["add", "    return orders;"],
        ["ctx", "}"]
      ]
    }
  }
};
